<?php
/**
 * Plugin Name: Desarrolla360 Bridge
 * Description: REST bridge between the Desarrolla360 portal and WordPress/Tutor LMS.
 * Version: 0.3.0
 * Author: Desarrolla360
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'D360_BRIDGE_VERSION', '0.3.0' );
define( 'D360_BRIDGE_OPTION_KEY', 'd360_bridge_settings' );
define( 'D360_BRIDGE_WEBHOOK_CRON_HOOK', 'd360_bridge_learning_webhook_tick' );
define( 'D360_BRIDGE_WEBHOOK_CURSOR_OPTION', 'd360_bridge_learning_webhook_cursor' );

add_action( 'admin_menu', 'd360_bridge_register_settings_page' );
add_action( 'admin_init', 'd360_bridge_register_settings' );
add_action( 'rest_api_init', 'd360_bridge_register_rest_routes' );
add_action( 'init', 'd360_bridge_handle_portal_autologin', 1 );
add_action( 'init', 'd360_bridge_maybe_schedule_learning_webhook' );
add_filter( 'cron_schedules', 'd360_bridge_register_cron_schedule' );
add_action( D360_BRIDGE_WEBHOOK_CRON_HOOK, 'd360_bridge_process_learning_webhook_tick' );

register_activation_hook( __FILE__, 'd360_bridge_activate_plugin' );
register_deactivation_hook( __FILE__, 'd360_bridge_deactivate_plugin' );

function d360_bridge_default_settings() {
	return array(
		'portal_key'        => '',
		'service_user_id'   => 0,
		'tutor_api_key'     => '',
		'tutor_api_secret'  => '',
		'portal_webhook_url' => '',
		'portal_webhook_secret' => '',
		'webhook_batch_size' => 10,
	);
}

function d360_bridge_get_settings() {
	$settings = get_option( D360_BRIDGE_OPTION_KEY, array() );

	if ( ! is_array( $settings ) ) {
		$settings = array();
	}

	return wp_parse_args( $settings, d360_bridge_default_settings() );
}

function d360_bridge_get_portal_key() {
	if ( defined( 'D360_PORTAL_SHARED_KEY' ) && D360_PORTAL_SHARED_KEY ) {
		return (string) D360_PORTAL_SHARED_KEY;
	}

	$settings = d360_bridge_get_settings();
	return (string) $settings['portal_key'];
}

function d360_bridge_get_service_user_id() {
	if ( defined( 'D360_BRIDGE_SERVICE_USER_ID' ) && D360_BRIDGE_SERVICE_USER_ID ) {
		return (int) D360_BRIDGE_SERVICE_USER_ID;
	}

	$settings = d360_bridge_get_settings();
	return (int) $settings['service_user_id'];
}

function d360_bridge_get_tutor_api_key() {
	if ( defined( 'D360_TUTOR_API_KEY' ) && D360_TUTOR_API_KEY ) {
		return (string) D360_TUTOR_API_KEY;
	}

	$settings = d360_bridge_get_settings();
	return (string) $settings['tutor_api_key'];
}

function d360_bridge_get_tutor_api_secret() {
	if ( defined( 'D360_TUTOR_API_SECRET' ) && D360_TUTOR_API_SECRET ) {
		return (string) D360_TUTOR_API_SECRET;
	}

	$settings = d360_bridge_get_settings();
	return (string) $settings['tutor_api_secret'];
}

function d360_bridge_get_portal_webhook_url() {
	if ( defined( 'D360_BRIDGE_PORTAL_WEBHOOK_URL' ) && D360_BRIDGE_PORTAL_WEBHOOK_URL ) {
		return esc_url_raw( (string) D360_BRIDGE_PORTAL_WEBHOOK_URL );
	}

	$settings = d360_bridge_get_settings();
	return esc_url_raw( (string) $settings['portal_webhook_url'] );
}

function d360_bridge_get_portal_webhook_secret() {
	if ( defined( 'D360_BRIDGE_WEBHOOK_SECRET' ) && D360_BRIDGE_WEBHOOK_SECRET ) {
		return (string) D360_BRIDGE_WEBHOOK_SECRET;
	}

	$settings = d360_bridge_get_settings();
	return (string) $settings['portal_webhook_secret'];
}

function d360_bridge_get_webhook_batch_size() {
	if ( defined( 'D360_BRIDGE_WEBHOOK_BATCH_SIZE' ) && D360_BRIDGE_WEBHOOK_BATCH_SIZE ) {
		return max( 1, min( 50, (int) D360_BRIDGE_WEBHOOK_BATCH_SIZE ) );
	}

	$settings = d360_bridge_get_settings();
	return max( 1, min( 50, absint( $settings['webhook_batch_size'] ) ) );
}

function d360_bridge_is_learning_webhook_configured() {
	return '' !== d360_bridge_get_portal_webhook_url() && '' !== d360_bridge_get_portal_webhook_secret();
}

function d360_bridge_get_site_origin() {
	$home_url = home_url( '/' );
	$parts    = wp_parse_url( $home_url );

	if ( empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
		return '';
	}

	$origin = $parts['scheme'] . '://' . $parts['host'];

	if ( ! empty( $parts['port'] ) ) {
		$origin .= ':' . $parts['port'];
	}

	return untrailingslashit( $origin );
}

function d360_bridge_get_autologin_signature( $user_id, $expires_at, $redirect_path ) {
	$shared_key = d360_bridge_get_portal_key();

	if ( '' === $shared_key ) {
		return '';
	}

	$payload = implode( '|', array( (int) $user_id, (int) $expires_at, (string) $redirect_path ) );
	return hash_hmac( 'sha256', $payload, $shared_key );
}

function d360_bridge_normalize_autologin_redirect( $redirect_to ) {
	$redirect_to = is_string( $redirect_to ) ? trim( $redirect_to ) : '';

	if ( '' === $redirect_to ) {
		return '';
	}

	if ( 0 === strpos( $redirect_to, '/' ) ) {
		return $redirect_to;
	}

	$site_origin = d360_bridge_get_site_origin();
	if ( '' === $site_origin ) {
		return '';
	}

	if ( 0 === strpos( $redirect_to, $site_origin ) ) {
		$relative = substr( $redirect_to, strlen( $site_origin ) );
		return 0 === strpos( $relative, '/' ) ? $relative : '/' . ltrim( $relative, '/' );
	}

	return '';
}

function d360_bridge_handle_portal_autologin() {
	if ( empty( $_GET['d360_autologin'] ) ) {
		return;
	}

	$user_id     = isset( $_GET['uid'] ) ? absint( wp_unslash( $_GET['uid'] ) ) : 0;
	$expires_at  = isset( $_GET['exp'] ) ? absint( wp_unslash( $_GET['exp'] ) ) : 0;
	$redirect_to = isset( $_GET['redirect_to'] ) ? sanitize_text_field( wp_unslash( $_GET['redirect_to'] ) ) : '';
	$signature   = isset( $_GET['sig'] ) ? sanitize_text_field( wp_unslash( $_GET['sig'] ) ) : '';

	if ( ! $user_id || ! $expires_at || '' === $redirect_to || '' === $signature ) {
		return;
	}

	if ( time() > $expires_at ) {
		wp_die( 'El acceso al curso ha expirado. Regresa al portal y vuelve a intentarlo.', 'Enlace expirado', array( 'response' => 403 ) );
	}

	$redirect_path = d360_bridge_normalize_autologin_redirect( $redirect_to );
	if ( '' === $redirect_path ) {
		wp_die( 'La redireccion solicitada no es valida.', 'Redireccion invalida', array( 'response' => 400 ) );
	}

	$expected_signature = d360_bridge_get_autologin_signature( $user_id, $expires_at, $redirect_path );
	if ( '' === $expected_signature || ! hash_equals( $expected_signature, $signature ) ) {
		wp_die( 'No fue posible validar el acceso al curso.', 'Firma invalida', array( 'response' => 403 ) );
	}

	$user = get_user_by( 'id', $user_id );
	if ( ! $user instanceof WP_User ) {
		wp_die( 'No fue posible resolver el usuario de WordPress.', 'Usuario no encontrado', array( 'response' => 404 ) );
	}

	wp_set_current_user( $user->ID );
	wp_set_auth_cookie( $user->ID, false, is_ssl() );

	$target_url = home_url( $redirect_path );
	wp_safe_redirect( $target_url );
	exit;
}

function d360_bridge_register_cron_schedule( $schedules ) {
	if ( ! isset( $schedules['d360_every_minute'] ) ) {
		$schedules['d360_every_minute'] = array(
			'interval' => 60,
			'display'  => 'Every Minute (Desarrolla360 Bridge)',
		);
	}

	return $schedules;
}

function d360_bridge_schedule_learning_webhook() {
	if ( ! wp_next_scheduled( D360_BRIDGE_WEBHOOK_CRON_HOOK ) ) {
		wp_schedule_event( time() + 60, 'd360_every_minute', D360_BRIDGE_WEBHOOK_CRON_HOOK );
	}
}

function d360_bridge_unschedule_learning_webhook() {
	$timestamp = wp_next_scheduled( D360_BRIDGE_WEBHOOK_CRON_HOOK );

	while ( $timestamp ) {
		wp_unschedule_event( $timestamp, D360_BRIDGE_WEBHOOK_CRON_HOOK );
		$timestamp = wp_next_scheduled( D360_BRIDGE_WEBHOOK_CRON_HOOK );
	}
}

function d360_bridge_activate_plugin() {
	d360_bridge_schedule_learning_webhook();
}

function d360_bridge_deactivate_plugin() {
	d360_bridge_unschedule_learning_webhook();
}

function d360_bridge_maybe_schedule_learning_webhook() {
	if ( ! d360_bridge_is_learning_webhook_configured() ) {
		d360_bridge_unschedule_learning_webhook();
		return;
	}

	d360_bridge_schedule_learning_webhook();
}

function d360_bridge_register_settings_page() {
	add_options_page(
		'Desarrolla360 Bridge',
		'Desarrolla360 Bridge',
		'manage_options',
		'd360-bridge',
		'd360_bridge_render_settings_page'
	);
}

function d360_bridge_register_settings() {
	register_setting(
		'd360_bridge',
		D360_BRIDGE_OPTION_KEY,
		array(
			'type'              => 'array',
			'sanitize_callback' => 'd360_bridge_sanitize_settings',
			'default'           => d360_bridge_default_settings(),
		)
	);
}

function d360_bridge_sanitize_settings( $input ) {
	$input = is_array( $input ) ? $input : array();

	return array(
		'portal_key'        => isset( $input['portal_key'] ) ? sanitize_text_field( $input['portal_key'] ) : '',
		'service_user_id'   => isset( $input['service_user_id'] ) ? absint( $input['service_user_id'] ) : 0,
		'tutor_api_key'     => isset( $input['tutor_api_key'] ) ? sanitize_text_field( $input['tutor_api_key'] ) : '',
		'tutor_api_secret'  => isset( $input['tutor_api_secret'] ) ? sanitize_text_field( $input['tutor_api_secret'] ) : '',
		'portal_webhook_url' => isset( $input['portal_webhook_url'] ) ? esc_url_raw( $input['portal_webhook_url'] ) : '',
		'portal_webhook_secret' => isset( $input['portal_webhook_secret'] ) ? sanitize_text_field( $input['portal_webhook_secret'] ) : '',
		'webhook_batch_size' => isset( $input['webhook_batch_size'] ) ? max( 1, min( 50, absint( $input['webhook_batch_size'] ) ) ) : 10,
	);
}

function d360_bridge_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$settings = d360_bridge_get_settings();
	?>
	<div class="wrap">
		<h1>Desarrolla360 Bridge</h1>
		<p>Configura la llave compartida del portal y el usuario de servicio que usara Tutor LMS internamente.</p>
		<form method="post" action="options.php">
			<?php settings_fields( 'd360_bridge' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="d360-portal-key">Portal Shared Key</label></th>
					<td>
						<input
							id="d360-portal-key"
							name="<?php echo esc_attr( D360_BRIDGE_OPTION_KEY ); ?>[portal_key]"
							type="text"
							class="regular-text"
							value="<?php echo esc_attr( $settings['portal_key'] ); ?>"
						/>
						<p class="description">Debe coincidir con la variable <code>WP_BRIDGE_PORTAL_KEY</code> del portal.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="d360-service-user-id">Service User ID</label></th>
					<td>
						<input
							id="d360-service-user-id"
							name="<?php echo esc_attr( D360_BRIDGE_OPTION_KEY ); ?>[service_user_id]"
							type="number"
							min="1"
							class="small-text"
							value="<?php echo esc_attr( $settings['service_user_id'] ); ?>"
						/>
						<p class="description">Usuario administrador de WordPress que se usara para invocar los endpoints internos de Tutor LMS.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="d360-tutor-api-key">Tutor API Key</label></th>
					<td>
						<input
							id="d360-tutor-api-key"
							name="<?php echo esc_attr( D360_BRIDGE_OPTION_KEY ); ?>[tutor_api_key]"
							type="text"
							class="regular-text"
							value="<?php echo esc_attr( $settings['tutor_api_key'] ); ?>"
						/>
						<p class="description">Opcional. API key oficial de Tutor LMS para llamadas de respaldo a enrollments.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="d360-tutor-api-secret">Tutor API Secret</label></th>
					<td>
						<input
							id="d360-tutor-api-secret"
							name="<?php echo esc_attr( D360_BRIDGE_OPTION_KEY ); ?>[tutor_api_secret]"
							type="password"
							class="regular-text"
							value="<?php echo esc_attr( $settings['tutor_api_secret'] ); ?>"
						/>
						<p class="description">Opcional. Secret oficial de Tutor LMS para completar accesos cuando el Service User no tenga permisos suficientes.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="d360-portal-webhook-url">Portal Webhook URL</label></th>
					<td>
						<input
							id="d360-portal-webhook-url"
							name="<?php echo esc_attr( D360_BRIDGE_OPTION_KEY ); ?>[portal_webhook_url]"
							type="url"
							class="regular-text"
							value="<?php echo esc_attr( $settings['portal_webhook_url'] ); ?>"
						/>
						<p class="description">URL del portal que recibira cambios academicos. Ejemplo: <code>https://portal.tudominio.com/api/internal/webhooks/tutor-learning</code>.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="d360-portal-webhook-secret">Portal Webhook Secret</label></th>
					<td>
						<input
							id="d360-portal-webhook-secret"
							name="<?php echo esc_attr( D360_BRIDGE_OPTION_KEY ); ?>[portal_webhook_secret]"
							type="password"
							class="regular-text"
							value="<?php echo esc_attr( $settings['portal_webhook_secret'] ); ?>"
						/>
						<p class="description">Debe coincidir con <code>BRIDGE_WEBHOOK_SECRET</code> del portal para validar la firma HMAC.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="d360-webhook-batch-size">Webhook Batch Size</label></th>
					<td>
						<input
							id="d360-webhook-batch-size"
							name="<?php echo esc_attr( D360_BRIDGE_OPTION_KEY ); ?>[webhook_batch_size]"
							type="number"
							min="1"
							max="50"
							class="small-text"
							value="<?php echo esc_attr( $settings['webhook_batch_size'] ); ?>"
						/>
						<p class="description">Cuantos alumnos vinculados revisa el bridge por minuto. Recomendado: 10.</p>
					</td>
				</tr>
			</table>
			<?php submit_button( 'Guardar configuracion' ); ?>
		</form>
	</div>
	<?php
}

function d360_bridge_register_rest_routes() {
	register_rest_route(
		'desarrolla360/v1',
		'/health',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'd360_bridge_health',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/courses',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'd360_bridge_courses',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/courses/(?P<course_id>\d+)',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'd360_bridge_course_details',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/bundles',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'd360_bridge_create_bundle',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/bundles/(?P<bundle_id>\d+)/diagnostics',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'd360_bridge_bundle_diagnostics',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/bundles/(?P<bundle_id>\d+)',
		array(
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => 'd360_bridge_update_bundle',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/employees/upsert',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'd360_bridge_upsert_employee',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/employees/delete',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'd360_bridge_delete_employee',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/enrollments/batch',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'd360_bridge_batch_enrollments',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/enrollments/company-batch',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'd360_bridge_company_batch_enrollments',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/students/(?P<student_id>\d+)/courses',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'd360_bridge_student_courses',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/students/(?P<student_id>\d+)/dashboard',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'd360_bridge_student_dashboard',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/students/(?P<student_id>\d+)/certificates',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'd360_bridge_student_certificates',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/students/(?P<student_id>\d+)/diagnostics',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'd360_bridge_student_diagnostics',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);

	register_rest_route(
		'desarrolla360/v1',
		'/students/(?P<student_id>\d+)/access/ensure',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'd360_bridge_ensure_student_access',
			'permission_callback' => 'd360_bridge_rest_permissions',
		)
	);
}

function d360_bridge_rest_permissions( WP_REST_Request $request ) {
	$shared_key = d360_bridge_get_portal_key();
	$provided   = trim( (string) $request->get_header( 'X-D360-Portal-Key' ) );

	if ( $shared_key && $provided && hash_equals( $shared_key, $provided ) ) {
		return true;
	}

	$auth_header = trim( (string) $request->get_header( 'Authorization' ) );
	if ( $shared_key && 0 === stripos( $auth_header, 'Bearer ' ) ) {
		$bearer = trim( substr( $auth_header, 7 ) );
		if ( $bearer && hash_equals( $shared_key, $bearer ) ) {
			return true;
		}
	}

	if ( current_user_can( 'manage_options' ) ) {
		return true;
	}

	return new WP_Error(
		'd360_bridge_forbidden',
		'Portal key invalida o credenciales insuficientes.',
		array( 'status' => 401 )
	);
}

function d360_bridge_health() {
	$routes = rest_get_server()->get_routes();
	$tutor_available = false;

	foreach ( array_keys( $routes ) as $route ) {
		if ( 0 === strpos( $route, '/tutor/v1/' ) ) {
			$tutor_available = true;
			break;
		}
	}

	return rest_ensure_response(
		array(
			'ok'                      => true,
			'plugin_version'          => D360_BRIDGE_VERSION,
			'site_url'                => site_url(),
			'wordpress_version'       => get_bloginfo( 'version' ),
			'tutor_rest_available'    => $tutor_available,
			'service_user_configured' => d360_bridge_get_service_user_id() > 0,
			'tutor_api_configured'    => '' !== d360_bridge_get_tutor_api_key() && '' !== d360_bridge_get_tutor_api_secret(),
			'learning_webhook_configured' => d360_bridge_is_learning_webhook_configured(),
		)
	);
}

function d360_bridge_upsert_employee( WP_REST_Request $request ) {
	$params = $request->get_json_params();
	$params = is_array( $params ) ? $params : array();

	$email      = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';
	$first_name = isset( $params['first_name'] ) ? sanitize_text_field( $params['first_name'] ) : '';
	$last_name  = isset( $params['last_name'] ) ? sanitize_text_field( $params['last_name'] ) : '';
	$password   = isset( $params['password'] ) ? (string) $params['password'] : '';

	if ( ! $email || ! $first_name || ! $last_name ) {
		return new WP_Error(
			'd360_bridge_invalid_employee',
			'email, first_name y last_name son obligatorios.',
			array( 'status' => 400 )
		);
	}

	$user              = get_user_by( 'email', $email );
	$created           = false;
	$generated_password = null;

	if ( ! $user ) {
		if ( ! $password ) {
			$password = wp_generate_password( 18, true, true );
			$generated_password = $password;
		}

		$user_id = wp_create_user( $email, $password, $email );
		if ( is_wp_error( $user_id ) ) {
			return $user_id;
		}

		$user = get_user_by( 'id', $user_id );
		$created = true;
	}

	if ( ! $user instanceof WP_User ) {
		return new WP_Error(
			'd360_bridge_user_missing',
			'No fue posible resolver el usuario de WordPress.',
			array( 'status' => 500 )
		);
	}

	wp_update_user(
		array(
			'ID'           => $user->ID,
			'display_name' => trim( $first_name . ' ' . $last_name ),
			'first_name'   => $first_name,
			'last_name'    => $last_name,
			'nickname'     => trim( $first_name . ' ' . $last_name ),
		)
	);

	if ( empty( $user->roles ) ) {
		$user->set_role( 'subscriber' );
	}

	if ( isset( $params['employee_id'] ) ) {
		update_user_meta( $user->ID, 'd360_employee_id', sanitize_text_field( (string) $params['employee_id'] ) );
	}

	if ( isset( $params['company']['id'] ) ) {
		update_user_meta( $user->ID, 'd360_company_id', sanitize_text_field( (string) $params['company']['id'] ) );
	}

	if ( isset( $params['company']['name'] ) ) {
		update_user_meta( $user->ID, 'd360_company_name', sanitize_text_field( $params['company']['name'] ) );
	}

	if ( isset( $params['department'] ) ) {
		update_user_meta( $user->ID, 'd360_department', sanitize_text_field( (string) $params['department'] ) );
	}

	if ( isset( $params['position'] ) ) {
		update_user_meta( $user->ID, 'd360_position', sanitize_text_field( (string) $params['position'] ) );
	}

	return rest_ensure_response(
		array(
			'wp_user_id'         => $user->ID,
			'email'              => $user->user_email,
			'created'            => $created,
			'generated_password' => $generated_password,
		)
	);
}

function d360_bridge_delete_employee( WP_REST_Request $request ) {
	$params = $request->get_json_params();
	$params = is_array( $params ) ? $params : array();

	$user = d360_bridge_resolve_employee_user( $params );
	if ( ! $user instanceof WP_User ) {
		return rest_ensure_response(
			array(
				'found'                    => false,
				'deleted'                  => false,
				'wp_user_id'               => null,
				'email'                    => null,
				'enrollment_posts_deleted' => 0,
			)
		);
	}

	if ( user_can( $user, 'manage_options' ) ) {
		return new WP_Error(
			'd360_bridge_protected_user',
			'No se permite eliminar usuarios administrativos desde el portal.',
			array( 'status' => 409 )
		);
	}

	$enrollment_posts_deleted = d360_bridge_delete_student_enrollments( $user->ID );

	if ( ! function_exists( 'wp_delete_user' ) ) {
		require_once ABSPATH . 'wp-admin/includes/user.php';
	}

	$deleted = wp_delete_user( $user->ID );

	if ( ! $deleted ) {
		return new WP_Error(
			'd360_bridge_delete_failed',
			'WordPress no pudo eliminar el usuario solicitado.',
			array( 'status' => 500 )
		);
	}

	return rest_ensure_response(
		array(
			'found'                    => true,
			'deleted'                  => true,
			'wp_user_id'               => $user->ID,
			'email'                    => $user->user_email,
			'enrollment_posts_deleted' => $enrollment_posts_deleted,
		)
	);
}

function d360_bridge_resolve_employee_user( $params ) {
	$params = is_array( $params ) ? $params : array();

	$wp_user_id = isset( $params['wp_user_id'] ) ? absint( $params['wp_user_id'] ) : 0;
	if ( $wp_user_id ) {
		$user = get_user_by( 'id', $wp_user_id );
		if ( $user instanceof WP_User ) {
			return $user;
		}
	}

	$email = isset( $params['email'] ) ? sanitize_email( $params['email'] ) : '';
	if ( $email ) {
		$user = get_user_by( 'email', $email );
		if ( $user instanceof WP_User ) {
			return $user;
		}
	}

	$employee_id = isset( $params['employee_id'] ) ? sanitize_text_field( (string) $params['employee_id'] ) : '';
	if ( ! preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $employee_id ) ) {
		return null;
	}

	$users = get_users(
		array(
			'number'      => 1,
			'count_total' => false,
			'orderby'     => 'ID',
			'meta_key'    => 'd360_employee_id',
			'meta_value'  => $employee_id,
		)
	);

	if ( empty( $users ) || ! $users[0] instanceof WP_User ) {
		return null;
	}

	return $users[0];
}

function d360_bridge_get_student_enrollment_ids( $student_id ) {
	return get_posts(
		array(
			'post_type'        => 'tutor_enrolled',
			'post_status'      => 'any',
			'author'           => $student_id,
			'numberposts'      => -1,
			'orderby'          => 'ID',
			'order'            => 'DESC',
			'fields'           => 'ids',
			'suppress_filters' => false,
		)
	);
}

function d360_bridge_delete_student_enrollments( $student_id ) {
	$student_id = absint( $student_id );
	if ( ! $student_id ) {
		return 0;
	}

	$enrollment_ids = d360_bridge_get_student_enrollment_ids( $student_id );

	if ( empty( $enrollment_ids ) ) {
		return 0;
	}

	$deleted_count = 0;

	foreach ( $enrollment_ids as $enrollment_id ) {
		$deleted = wp_delete_post( (int) $enrollment_id, true );
		if ( $deleted ) {
			$deleted_count += 1;
		}
	}

	return $deleted_count;
}

function d360_bridge_courses() {
	$course_post_types = array( 'courses', 'course', 'tutor_course' );
	$post_type         = null;

	foreach ( $course_post_types as $candidate ) {
		if ( post_type_exists( $candidate ) ) {
			$post_type = $candidate;
			break;
		}
	}

	if ( ! $post_type ) {
		return new WP_Error(
			'd360_bridge_course_post_type_missing',
			'No se encontro el tipo de contenido de cursos de Tutor LMS en WordPress.',
			array( 'status' => 500 )
		);
	}

	$query = new WP_Query(
		array(
			'post_type'      => $post_type,
			'post_status'    => array( 'publish' ),
			'posts_per_page' => 200,
			'orderby'        => 'ID',
			'order'          => 'DESC',
			'fields'         => 'ids',
			'no_found_rows'  => true,
		)
	);

	$all_courses = array();

	foreach ( $query->posts as $course_id ) {
		$thumbnail = get_the_post_thumbnail_url( $course_id, 'large' );
		$all_courses[] = array(
			'wp_course_id'  => (int) $course_id,
			'title'         => get_the_title( $course_id ),
			'status'        => get_post_status( $course_id ),
			'post_type'     => $post_type,
			'course_url'    => get_permalink( $course_id ),
			'thumbnail_url' => $thumbnail ? $thumbnail : null,
		);
	}

	return rest_ensure_response(
		array(
			'courses' => $all_courses,
			'total'   => count( $all_courses ),
		)
	);
}

function d360_bridge_course_details( WP_REST_Request $request ) {
	$course_id = absint( $request['course_id'] );

	if ( ! $course_id ) {
		return new WP_Error(
			'd360_bridge_invalid_course_id',
			'Se requiere un course_id valido.',
			array( 'status' => 400 )
		);
	}

	$course = get_post( $course_id );
	if ( ! $course instanceof WP_Post ) {
		return new WP_Error(
			'd360_bridge_course_not_found',
			'No se encontro el curso solicitado.',
			array( 'status' => 404 )
		);
	}

	$tutor_payload = d360_bridge_dispatch_tutor_request(
		'GET',
		sprintf( '/tutor/v1/courses/%d', $course_id )
	);

	$normalized_tutor_payload = is_wp_error( $tutor_payload ) ? array() : d360_bridge_normalize_tutor_course_payload( $tutor_payload );
	$category_names           = d360_bridge_get_course_category_names( $course_id, $course->post_type );
	$thematic_area            = d360_bridge_extract_course_thematic_area( $course_id, $category_names );
	$instructor_name          = d360_bridge_extract_course_instructor_name( $course_id, $course->post_author );
	$instructor_signature_url = d360_bridge_extract_course_instructor_signature_url( $course_id );
	$training_agent_name      = d360_bridge_extract_course_training_agent_name( $course_id, $instructor_name );
	$training_agent_registry  = d360_bridge_extract_course_training_agent_registry( $course_id );
	$duration_hours           = d360_bridge_extract_course_duration_hours( $course_id, $normalized_tutor_payload );

	return rest_ensure_response(
		array(
			'wp_course_id'         => $course_id,
			'title'                => get_the_title( $course_id ),
			'status'               => get_post_status( $course_id ),
			'post_type'            => $course->post_type,
			'course_url'           => get_permalink( $course_id ),
			'summary'              => wp_strip_all_tags( get_the_excerpt( $course_id ) ),
			'instructor_name'      => $instructor_name,
			'instructor_signature_url' => $instructor_signature_url,
			'training_agent_name'  => $training_agent_name,
			'training_agent_registry' => $training_agent_registry,
			'duration_hours'       => $duration_hours,
			'duration_label'       => null !== $duration_hours ? sprintf( '%s horas', rtrim( rtrim( number_format( $duration_hours, 2, '.', '' ), '0' ), '.' ) ) : null,
			'thematic_area_name'   => $thematic_area['name'],
			'thematic_area_code'   => $thematic_area['code'],
			'category_names'       => $category_names,
			'tutor_course_payload' => $normalized_tutor_payload,
		)
	);
}

function d360_bridge_normalize_tutor_course_payload( $payload ) {
	if ( isset( $payload['course'] ) && is_array( $payload['course'] ) ) {
		return $payload['course'];
	}

	if ( isset( $payload['data'] ) && is_array( $payload['data'] ) ) {
		return $payload['data'];
	}

	return is_array( $payload ) ? $payload : array();
}

function d360_bridge_get_first_post_meta_value( $post_id, $meta_keys ) {
	foreach ( $meta_keys as $meta_key ) {
		$value = get_post_meta( $post_id, $meta_key, true );

		if ( '' === $value || null === $value ) {
			continue;
		}

		return maybe_unserialize( $value );
	}

	return null;
}

function d360_bridge_get_course_category_names( $course_id, $post_type ) {
	$taxonomy_candidates = array_merge(
		array( 'course-category', 'course_category', 'course_cat', 'tutor_course_category', 'category' ),
		get_object_taxonomies( $post_type, 'names' )
	);

	$taxonomy_candidates = array_values( array_unique( array_filter( $taxonomy_candidates, 'taxonomy_exists' ) ) );
	$names               = array();

	foreach ( $taxonomy_candidates as $taxonomy ) {
		$terms = get_the_terms( $course_id, $taxonomy );
		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			continue;
		}

		foreach ( $terms as $term ) {
			$names[] = $term->name;
		}
	}

	return array_values( array_unique( $names ) );
}

function d360_bridge_extract_course_instructor_name( $course_id, $author_id ) {
	$meta_value = d360_bridge_get_first_post_meta_value(
		$course_id,
		array(
			'stps_instructor_name',
			'tutor_instructor_name',
		)
	);

	if ( is_string( $meta_value ) && '' !== trim( $meta_value ) ) {
		return trim( $meta_value );
	}

	$author = get_user_by( 'id', absint( $author_id ) );
	if ( $author instanceof WP_User ) {
		return $author->display_name;
	}

	return '';
}

function d360_bridge_extract_course_training_agent_name( $course_id, $instructor_name ) {
	$meta_value = d360_bridge_get_first_post_meta_value(
		$course_id,
		array(
			'stps_agent_name',
			'd360_training_agent_name',
		)
	);

	if ( is_string( $meta_value ) && '' !== trim( $meta_value ) ) {
		return trim( $meta_value );
	}

	if ( '' !== $instructor_name ) {
		return $instructor_name;
	}

	return get_bloginfo( 'name' );
}

function d360_bridge_extract_course_training_agent_registry( $course_id ) {
	$meta_value = d360_bridge_get_first_post_meta_value(
		$course_id,
		array(
			'stps_agent_registry',
			'stps_registry',
			'stps_registration',
			'd360_training_agent_registry',
			'd360_stps_registration',
			'registro_stps',
		)
	);

	if ( is_scalar( $meta_value ) && '' !== trim( (string) $meta_value ) ) {
		return trim( (string) $meta_value );
	}

	return '';
}

function d360_bridge_extract_course_instructor_signature_url( $course_id ) {
	$meta_value = d360_bridge_get_first_post_meta_value(
		$course_id,
		array(
			'stps_instructor_signature_url',
			'd360_instructor_signature_url',
			'instructor_signature_url',
			'stps_instructor_signature_id',
			'd360_instructor_signature_id',
			'instructor_signature_id',
		)
	);

	if ( is_numeric( $meta_value ) ) {
		$attachment_url = wp_get_attachment_url( absint( $meta_value ) );
		return $attachment_url ? esc_url_raw( $attachment_url ) : '';
	}

	if ( is_string( $meta_value ) && '' !== trim( $meta_value ) ) {
		return esc_url_raw( trim( $meta_value ) );
	}

	return '';
}

function d360_bridge_extract_course_thematic_area( $course_id, $category_names ) {
	$name = d360_bridge_get_first_post_meta_value(
		$course_id,
		array(
			'stps_area_name',
			'd360_thematic_area_name',
			'_thematic_area_name',
			'thematic_area_name',
			'area_tematica',
		)
	);

	$code = d360_bridge_get_first_post_meta_value(
		$course_id,
		array(
			'stps_area_code',
			'd360_thematic_area_code',
			'_thematic_area_code',
			'thematic_area_code',
			'area_tematica_clave',
			'stps_area_clave',
		)
	);

	// Fallback: tomar el nombre de la primera categoria del curso.
	if ( ! is_string( $name ) || '' === trim( $name ) ) {
		$name = ! empty( $category_names ) ? $category_names[0] : '';
	}

	// Fallback para el codigo: buscarlo en el term meta de las taxonomias del curso.
	if ( ! is_scalar( $code ) || '' === trim( (string) $code ) ) {
		$taxonomy_candidates = array( 'course-category', 'course_category', 'tutor_course_category', 'category' );
		foreach ( $taxonomy_candidates as $taxonomy ) {
			if ( ! taxonomy_exists( $taxonomy ) ) {
				continue;
			}
			$terms = get_the_terms( $course_id, $taxonomy );
			if ( is_wp_error( $terms ) || empty( $terms ) ) {
				continue;
			}
			foreach ( $terms as $term ) {
				$term_code = get_term_meta( $term->term_id, 'stps_area_code', true );
				if ( '' === $term_code ) {
					$term_code = get_term_meta( $term->term_id, 'd360_thematic_area_code', true );
				}
				if ( '' === $term_code ) {
					$term_code = get_term_meta( $term->term_id, 'area_code', true );
				}
				if ( is_scalar( $term_code ) && '' !== trim( (string) $term_code ) ) {
					$code = trim( (string) $term_code );
					break 2;
				}
			}
		}
	}

	return array(
		'name' => is_string( $name ) ? trim( $name ) : '',
		'code' => is_scalar( $code ) ? trim( (string) $code ) : '',
	);
}

function d360_bridge_extract_course_duration_hours( $course_id, $tutor_payload ) {
	// Fuentes primarias: meta del post y payload de la API de Tutor LMS.
	$duration_sources = array(
		d360_bridge_get_first_post_meta_value(
			$course_id,
			array(
				'_course_duration',
				'course_duration',
				'_tutor_course_duration',
				'tutor_course_duration',
				'_tutor_course_duration_hours',
				'tutor_course_duration_hours',
				'duration_hours',
				'duration',
			)
		),
		isset( $tutor_payload['duration'] ) ? $tutor_payload['duration'] : null,
		isset( $tutor_payload['course_duration'] ) ? $tutor_payload['course_duration'] : null,
		isset( $tutor_payload['course_duration_hours'] ) ? $tutor_payload['course_duration_hours'] : null,
	);

	foreach ( $duration_sources as $duration_source ) {
		$hours = d360_bridge_parse_duration_hours( $duration_source );
		if ( null !== $hours ) {
			return $hours;
		}
	}

	// Fallback: calcular la duracion sumando los videos de todas las lecciones del curso.
	return d360_bridge_calculate_content_duration_hours( $course_id );
}

/**
 * Calcula la duracion total del curso sumando el playtime de los videos de sus lecciones.
 * Intenta primero con la API de topics de Tutor LMS y luego leyendo post meta directamente.
 */
function d360_bridge_calculate_content_duration_hours( $course_id ) {
	$total_seconds = 0;

	// Metodo 1: API de topics de Tutor LMS (/tutor/v1/course-topic/{id}).
	$topic_response = d360_bridge_dispatch_tutor_request( 'GET', sprintf( '/tutor/v1/course-topic/%d', $course_id ) );

	if ( ! is_wp_error( $topic_response ) ) {
		$topics = array();
		if ( isset( $topic_response['topics'] ) && is_array( $topic_response['topics'] ) ) {
			$topics = $topic_response['topics'];
		} elseif ( isset( $topic_response['data']['topics'] ) && is_array( $topic_response['data']['topics'] ) ) {
			$topics = $topic_response['data']['topics'];
		} elseif ( isset( $topic_response['data'] ) && is_array( $topic_response['data'] ) ) {
			$topics = $topic_response['data'];
		}

		foreach ( $topics as $topic ) {
			$contents = isset( $topic['contents'] ) && is_array( $topic['contents'] ) ? $topic['contents'] : array();
			foreach ( $contents as $content ) {
				if ( isset( $content['video']['playtime'] ) && is_numeric( $content['video']['playtime'] ) ) {
					$total_seconds += (float) $content['video']['playtime'];
				}
				// Algunos temas exponen duration directamente en segundos.
				if ( isset( $content['video']['runtime']['seconds'] ) && is_numeric( $content['video']['runtime']['seconds'] ) ) {
					$total_seconds += (float) $content['video']['runtime']['seconds'];
				}
			}
		}

		if ( $total_seconds > 0 ) {
			return round( $total_seconds / 3600, 2 );
		}
	}

	// Metodo 2: Leer _tutor_video post meta directamente de las lecciones del curso.
	// Busca lecciones que sean hijos directos del curso.
	$lesson_ids = get_posts( array(
		'post_type'      => 'tutor_lesson',
		'post_parent'    => $course_id,
		'posts_per_page' => -1,
		'fields'         => 'ids',
		'post_status'    => array( 'publish', 'private', 'draft' ),
	) );

	// Si no hay lecciones directas, busca dentro de los topics del curso.
	if ( empty( $lesson_ids ) ) {
		$topic_ids = get_posts( array(
			'post_type'      => 'topics',
			'post_parent'    => $course_id,
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'post_status'    => array( 'publish', 'private', 'draft' ),
		) );

		foreach ( $topic_ids as $topic_id ) {
			$topic_lesson_ids = get_posts( array(
				'post_type'      => 'tutor_lesson',
				'post_parent'    => $topic_id,
				'posts_per_page' => -1,
				'fields'         => 'ids',
				'post_status'    => array( 'publish', 'private', 'draft' ),
			) );
			$lesson_ids = array_merge( $lesson_ids, $topic_lesson_ids );
		}
	}

	foreach ( $lesson_ids as $lesson_id ) {
		$video_info = get_post_meta( $lesson_id, '_tutor_video', true );
		if ( ! is_array( $video_info ) ) {
			continue;
		}
		// playtime puede estar en segundos como entero, o en runtime.seconds.
		if ( isset( $video_info['playtime'] ) && is_numeric( $video_info['playtime'] ) && (float) $video_info['playtime'] > 0 ) {
			$total_seconds += (float) $video_info['playtime'];
		} elseif ( isset( $video_info['runtime']['seconds'] ) && is_numeric( $video_info['runtime']['seconds'] ) ) {
			$total_seconds += (float) $video_info['runtime']['seconds'];
		}
	}

	return $total_seconds > 0 ? round( $total_seconds / 3600, 2 ) : null;
}

function d360_bridge_parse_duration_hours( $value ) {
	if ( null === $value || '' === $value ) {
		return null;
	}

	if ( is_numeric( $value ) ) {
		return round( (float) $value, 2 );
	}

	if ( is_string( $value ) ) {
		$normalized = strtolower( trim( $value ) );
		if ( preg_match( '/^\d+(?:\.\d+)?$/', $normalized ) ) {
			return round( (float) $normalized, 2 );
		}

		if ( preg_match( '/(?:(\d+(?:\.\d+)?)\s*h(?:oras?)?)?\s*(?:(\d+(?:\.\d+)?)\s*m(?:in(?:utos?)?)?)?/', $normalized, $matches ) ) {
			$hours   = isset( $matches[1] ) && '' !== $matches[1] ? (float) $matches[1] : 0.0;
			$minutes = isset( $matches[2] ) && '' !== $matches[2] ? (float) $matches[2] : 0.0;
			if ( $hours > 0 || $minutes > 0 ) {
				return round( $hours + ( $minutes / 60 ), 2 );
			}
		}
	}

	if ( is_array( $value ) ) {
		$hours = 0.0;

		$key_map = array(
			'hour'    => 1,
			'hours'   => 1,
			'hr'      => 1,
			'hrs'     => 1,
			'minute'  => 1 / 60,
			'minutes' => 1 / 60,
			'min'     => 1 / 60,
			'mins'    => 1 / 60,
			'day'     => 24,
			'days'    => 24,
			'week'    => 24 * 7,
			'weeks'   => 24 * 7,
		);

		foreach ( $value as $key => $item ) {
			if ( is_array( $item ) ) {
				$nested_hours = d360_bridge_parse_duration_hours( $item );
				if ( null !== $nested_hours ) {
					return $nested_hours;
				}
				continue;
			}

			if ( ! is_scalar( $item ) ) {
				continue;
			}

			$normalized_key = strtolower( preg_replace( '/[^a-z]/', '', (string) $key ) );
			if ( isset( $key_map[ $normalized_key ] ) && is_numeric( $item ) ) {
				$hours += (float) $item * $key_map[ $normalized_key ];
			}
		}

		if ( $hours > 0 ) {
			return round( $hours, 2 );
		}
	}

	return null;
}

function d360_bridge_create_bundle( WP_REST_Request $request ) {
	$bundle_id             = 0;
	$bundle_post_type      = '';
	$visibility            = 'private';
	$validated_course_ids  = array();
	$title                 = '';

	try {
		$params      = $request->get_json_params();
		$params      = is_array( $params ) ? $params : array();
		$title       = isset( $params['title'] ) ? sanitize_text_field( $params['title'] ) : '';
		$description = isset( $params['description'] ) ? wp_kses_post( (string) $params['description'] ) : '';
		$visibility  = isset( $params['visibility'] ) ? sanitize_key( $params['visibility'] ) : 'private';
		$course_ids  = isset( $params['course_ids'] ) && is_array( $params['course_ids'] ) ? $params['course_ids'] : array();
		$course_ids  = array_values(
			array_filter(
				array_map( 'absint', $course_ids )
			)
		);

		if ( '' === $title || empty( $course_ids ) ) {
			return new WP_Error(
				'd360_bridge_invalid_bundle',
				'title y course_ids son obligatorios para crear el bundle.',
				array( 'status' => 400 )
			);
		}

		$bundle_post_type = d360_bridge_detect_bundle_post_type();
		if ( is_wp_error( $bundle_post_type ) ) {
			return $bundle_post_type;
		}

		$validated_course_ids = d360_bridge_validate_bundle_course_ids( $course_ids );
		if ( is_wp_error( $validated_course_ids ) ) {
			return $validated_course_ids;
		}

		$post_status = 'private' === $visibility ? 'private' : 'publish';
		$bundle_id   = wp_insert_post(
			array(
				'post_type'    => $bundle_post_type,
				'post_title'   => $title,
				'post_content' => $description,
				'post_status'  => $post_status,
				'meta_input'   => d360_bridge_build_bundle_meta_input( $validated_course_ids, $visibility ),
			),
			true,
			false
		);

		if ( is_wp_error( $bundle_id ) ) {
			return $bundle_id;
		}

		d360_bridge_store_bundle_course_relationships( $bundle_id, $validated_course_ids );

		update_post_meta( $bundle_id, 'd360_managed_bundle', 1 );
		update_post_meta( $bundle_id, 'd360_bundle_visibility', $visibility );

		return rest_ensure_response(
			array(
				'bundle_id'   => (int) $bundle_id,
				'title'       => get_the_title( $bundle_id ),
				'post_type'   => $bundle_post_type,
				'status'      => get_post_status( $bundle_id ),
				'visibility'  => $visibility,
				'permalink'   => '',
				'course_ids'  => $validated_course_ids,
			)
		);
	} catch ( Throwable $error ) {
		$persisted_course_ids = $bundle_id ? d360_bridge_read_bundle_course_ids( $bundle_id ) : array();

		if ( $bundle_id && ! empty( $persisted_course_ids ) ) {
			if ( function_exists( 'error_log' ) ) {
				error_log( '[Desarrolla360 Bridge] Bundle created with recoverable warning: ' . $error->getMessage() );
			}

			return rest_ensure_response(
				array(
					'bundle_id'   => (int) $bundle_id,
					'title'       => get_the_title( $bundle_id ),
					'post_type'   => $bundle_post_type ? $bundle_post_type : get_post_type( $bundle_id ),
					'status'      => get_post_status( $bundle_id ),
					'visibility'  => $visibility,
					'permalink'   => '',
					'course_ids'  => $persisted_course_ids,
					'warning'     => $error->getMessage(),
				)
			);
		}

		$recovered_bundle = d360_bridge_find_recent_bundle_by_signature(
			$title,
			$bundle_post_type,
			$validated_course_ids
		);

		if ( $recovered_bundle instanceof WP_Post ) {
			$recovered_course_ids = d360_bridge_read_bundle_course_ids( $recovered_bundle->ID );

			if ( ! empty( $recovered_course_ids ) ) {
				if ( function_exists( 'error_log' ) ) {
					error_log( '[Desarrolla360 Bridge] Bundle recovered after warning: ' . $error->getMessage() );
				}

				return rest_ensure_response(
					array(
						'bundle_id'   => (int) $recovered_bundle->ID,
						'title'       => get_the_title( $recovered_bundle->ID ),
						'post_type'   => $recovered_bundle->post_type,
						'status'      => get_post_status( $recovered_bundle->ID ),
						'visibility'  => $visibility,
						'permalink'   => '',
						'course_ids'  => $recovered_course_ids,
						'warning'     => $error->getMessage(),
						'recovered'   => true,
					)
				);
			}
		}

		if ( function_exists( 'error_log' ) ) {
			error_log( '[Desarrolla360 Bridge] Bundle creation failed: ' . $error->getMessage() );
		}

		return new WP_Error(
			'd360_bridge_bundle_fatal',
			'Fallo interno al crear el bundle: ' . $error->getMessage(),
			array( 'status' => 500 )
		);
	}
}

function d360_bridge_update_bundle( WP_REST_Request $request ) {
	$bundle_id = absint( $request['bundle_id'] );

	try {
		$bundle = get_post( $bundle_id );

		if ( ! $bundle instanceof WP_Post ) {
			return new WP_Error(
				'd360_bridge_bundle_not_found',
				'No se encontro el bundle indicado.',
				array( 'status' => 404 )
			);
		}

		if ( '1' !== (string) get_post_meta( $bundle_id, 'd360_managed_bundle', true ) ) {
			return new WP_Error(
				'd360_bridge_bundle_not_managed',
				'Este bundle no fue creado por el portal Desarrolla360, no se puede actualizar desde aqui.',
				array( 'status' => 403 )
			);
		}

		$params      = $request->get_json_params();
		$params      = is_array( $params ) ? $params : array();
		$title       = isset( $params['title'] ) ? sanitize_text_field( $params['title'] ) : null;
		$description = isset( $params['description'] ) ? wp_kses_post( (string) $params['description'] ) : null;
		$course_ids  = isset( $params['course_ids'] ) && is_array( $params['course_ids'] ) ? $params['course_ids'] : array();
		$course_ids  = array_values(
			array_filter(
				array_map( 'absint', $course_ids )
			)
		);

		if ( empty( $course_ids ) ) {
			return new WP_Error(
				'd360_bridge_invalid_bundle',
				'course_ids es obligatorio para actualizar el bundle.',
				array( 'status' => 400 )
			);
		}

		$validated_course_ids = d360_bridge_validate_bundle_course_ids( $course_ids );
		if ( is_wp_error( $validated_course_ids ) ) {
			return $validated_course_ids;
		}

		if ( null !== $title || null !== $description ) {
			$update_args = array( 'ID' => $bundle_id );
			if ( null !== $title && '' !== $title ) {
				$update_args['post_title'] = $title;
			}
			if ( null !== $description ) {
				$update_args['post_content'] = $description;
			}

			$updated = wp_update_post( $update_args, true );
			if ( is_wp_error( $updated ) ) {
				return $updated;
			}
		}

		d360_bridge_store_bundle_course_relationships( $bundle_id, $validated_course_ids );
		update_post_meta( $bundle_id, 'd360_bundle_course_count', count( $validated_course_ids ) );

		return rest_ensure_response(
			array(
				'bundle_id'  => (int) $bundle_id,
				'title'      => get_the_title( $bundle_id ),
				'post_type'  => get_post_type( $bundle_id ),
				'status'     => get_post_status( $bundle_id ),
				'course_ids' => $validated_course_ids,
			)
		);
	} catch ( Throwable $error ) {
		if ( function_exists( 'error_log' ) ) {
			error_log( '[Desarrolla360 Bridge] Bundle update failed: ' . $error->getMessage() );
		}

		return new WP_Error(
			'd360_bridge_bundle_update_fatal',
			'Fallo interno al actualizar el bundle: ' . $error->getMessage(),
			array( 'status' => 500 )
		);
	}
}

function d360_bridge_find_recent_bundle_by_signature( $title, $post_type, $course_ids ) {
	$title     = is_string( $title ) ? trim( $title ) : '';
	$post_type = is_string( $post_type ) ? trim( $post_type ) : '';
	$course_ids = array_values( array_unique( array_map( 'absint', is_array( $course_ids ) ? $course_ids : array() ) ) );

	if ( '' === $title ) {
		return null;
	}

	$post_types = array();

	if ( '' !== $post_type ) {
		$post_types[] = $post_type;
	}

	$template_bundle = d360_bridge_find_bundle_template_post();
	if ( $template_bundle instanceof WP_Post && ! in_array( $template_bundle->post_type, $post_types, true ) ) {
		$post_types[] = $template_bundle->post_type;
	}

	if ( empty( $post_types ) ) {
		$detected_post_type = d360_bridge_detect_bundle_post_type();
		if ( ! is_wp_error( $detected_post_type ) ) {
			$post_types[] = $detected_post_type;
		}
	}

	if ( empty( $post_types ) ) {
		return null;
	}

	$matches = get_posts(
		array(
			'post_type'        => $post_types,
			'post_status'      => array( 'publish', 'private', 'draft', 'pending' ),
			'numberposts'      => 10,
			'orderby'          => 'ID',
			'order'            => 'DESC',
			'suppress_filters' => false,
			'title'            => $title,
		)
	);

	if ( empty( $matches ) ) {
		$matches = get_posts(
			array(
				'post_type'        => $post_types,
				'post_status'      => array( 'publish', 'private', 'draft', 'pending' ),
				'numberposts'      => 10,
				'orderby'          => 'ID',
				'order'            => 'DESC',
				'suppress_filters' => false,
			)
		);
	}

	foreach ( $matches as $match ) {
		if ( ! $match instanceof WP_Post ) {
			continue;
		}

		if ( trim( wp_strip_all_tags( get_the_title( $match->ID ) ) ) !== $title ) {
			continue;
		}

		$persisted_course_ids = d360_bridge_read_bundle_course_ids( $match->ID );
		if ( empty( $persisted_course_ids ) ) {
			continue;
		}

		if ( empty( $course_ids ) ) {
			return $match;
		}

		$left  = $persisted_course_ids;
		$right = $course_ids;
		sort( $left );
		sort( $right );

		if ( $left === $right ) {
			return $match;
		}
	}

	return null;
}

function d360_bridge_read_bundle_course_ids( $bundle_id ) {
	$bundle_id = absint( $bundle_id );
	if ( ! $bundle_id ) {
		return array();
	}

	$candidates = array(
		'bundle-course-ids',
		'_tutor_bundle_course_ids',
		'tutor_bundle_course_ids',
		'd360_bundle_course_ids',
	);

	foreach ( $candidates as $meta_key ) {
		$value      = get_post_meta( $bundle_id, $meta_key, true );
		$course_ids = d360_bridge_debug_extract_course_ids_from_meta_value( $value );

		if ( ! empty( $course_ids ) ) {
			return $course_ids;
		}
	}

	return array();
}

function d360_bridge_bundle_diagnostics( WP_REST_Request $request ) {
	$bundle_id = absint( $request['bundle_id'] );

	if ( ! $bundle_id ) {
		return new WP_Error(
			'd360_bridge_invalid_bundle_id',
			'Se requiere un bundle_id valido.',
			array( 'status' => 400 )
		);
	}

	$bundle = get_post( $bundle_id );
	if ( ! $bundle instanceof WP_Post ) {
		return new WP_Error(
			'd360_bridge_bundle_not_found',
			'No se encontro el bundle solicitado.',
			array( 'status' => 404 )
		);
	}

	$template_bundle = d360_bridge_find_bundle_template_post( $bundle_id );
	$meta_snapshot   = d360_bridge_debug_collect_post_meta( $bundle_id );

	return rest_ensure_response(
		array(
			'bundle' => array(
				'id'         => $bundle->ID,
				'title'      => get_the_title( $bundle->ID ),
				'post_type'  => $bundle->post_type,
				'status'     => get_post_status( $bundle->ID ),
				'permalink'  => d360_bridge_safe_get_permalink( $bundle->ID ),
			),
			'template_bundle' => $template_bundle instanceof WP_Post
				? array(
					'id'        => $template_bundle->ID,
					'title'     => get_the_title( $template_bundle->ID ),
					'post_type' => $template_bundle->post_type,
					'status'    => get_post_status( $template_bundle->ID ),
				)
				: null,
			'detected_courses' => d360_bridge_debug_detect_bundle_courses_from_meta( $meta_snapshot ),
			'meta' => $meta_snapshot,
		)
	);
}

function d360_bridge_detect_bundle_post_type() {
	$template_bundle = d360_bridge_find_bundle_template_post();
	if ( $template_bundle instanceof WP_Post ) {
		return $template_bundle->post_type;
	}

	$candidates = array(
		'tutor_bundle',
		'tutor-bundle',
		'course_bundle',
		'course-bundle',
		'bundle',
		'bundles',
	);

	foreach ( $candidates as $candidate ) {
		if ( post_type_exists( $candidate ) ) {
			return $candidate;
		}
	}

	$post_types = get_post_types( array(), 'objects' );
	foreach ( $post_types as $post_type => $object ) {
		$label        = isset( $object->label ) ? strtolower( (string) $object->label ) : '';
		$singular     = isset( $object->labels->singular_name ) ? strtolower( (string) $object->labels->singular_name ) : '';
		$type_name    = strtolower( (string) $post_type );
		$bundle_match = false !== strpos( $label, 'bundle' ) || false !== strpos( $singular, 'bundle' ) || false !== strpos( $type_name, 'bundle' );

		if ( $bundle_match ) {
			return $post_type;
		}
	}

	return new WP_Error(
		'd360_bridge_bundle_post_type_missing',
		'No se detecto el post type del addon Course Bundle de Tutor LMS. Activa el addon oficial y vuelve a intentar.',
		array( 'status' => 409 )
	);
}

function d360_bridge_find_bundle_template_post( $exclude_id = 0 ) {
	$exclude_id        = absint( $exclude_id );
	$course_post_types = array( 'courses', 'course', 'tutor_course' );
	$valid_post_types  = array();

	foreach ( $course_post_types as $candidate ) {
		if ( post_type_exists( $candidate ) ) {
			$valid_post_types[] = $candidate;
		}
	}

	if ( ! empty( $valid_post_types ) ) {
		$meta_keys = array(
			'_tutor_course_type',
			'tutor_course_type',
			'_course_type',
			'course_type',
		);

		foreach ( $meta_keys as $meta_key ) {
			$matches = get_posts(
				array(
					'post_type'        => $valid_post_types,
					'post_status'      => array( 'publish', 'private', 'draft', 'pending' ),
					'numberposts'      => 1,
					'orderby'          => 'ID',
					'order'            => 'DESC',
					'suppress_filters' => false,
					'post__not_in'     => $exclude_id ? array( $exclude_id ) : array(),
					'meta_key'         => $meta_key,
					'meta_value'       => 'bundle',
				)
			);

			if ( ! empty( $matches ) && $matches[0] instanceof WP_Post ) {
				return $matches[0];
			}
		}
	}

	$bundle_post_types = array(
		'tutor_bundle',
		'tutor-bundle',
		'course_bundle',
		'course-bundle',
		'bundle',
		'bundles',
	);

	foreach ( $bundle_post_types as $post_type ) {
		if ( ! post_type_exists( $post_type ) ) {
			continue;
		}

		$matches = get_posts(
			array(
				'post_type'        => $post_type,
				'post_status'      => array( 'publish', 'private', 'draft', 'pending' ),
				'numberposts'      => 1,
				'orderby'          => 'ID',
				'order'            => 'DESC',
				'suppress_filters' => false,
				'post__not_in'     => $exclude_id ? array( $exclude_id ) : array(),
			)
		);

		if ( ! empty( $matches ) && $matches[0] instanceof WP_Post ) {
			return $matches[0];
		}
	}

	return null;
}

function d360_bridge_validate_bundle_course_ids( $course_ids ) {
	$course_post_types = array( 'courses', 'course', 'tutor_course' );
	$valid_post_types  = array();

	foreach ( $course_post_types as $candidate ) {
		if ( post_type_exists( $candidate ) ) {
			$valid_post_types[] = $candidate;
		}
	}

	if ( empty( $valid_post_types ) ) {
		return new WP_Error(
			'd360_bridge_course_post_type_missing',
			'No se encontro el tipo de contenido de cursos de Tutor LMS en WordPress.',
			array( 'status' => 500 )
		);
	}

	$validated = array();

	foreach ( $course_ids as $course_id ) {
		$course = get_post( $course_id );

		if ( ! $course instanceof WP_Post || ! in_array( $course->post_type, $valid_post_types, true ) ) {
			return new WP_Error(
				'd360_bridge_invalid_bundle_course',
				sprintf( 'El curso %d no existe o no pertenece a Tutor LMS.', absint( $course_id ) ),
				array( 'status' => 400 )
			);
		}

		$validated[] = (int) $course_id;
	}

	return array_values( array_unique( $validated ) );
}

function d360_bridge_store_bundle_course_relationships( $bundle_id, $course_ids ) {
	$bundle_id  = absint( $bundle_id );
	$course_ids = array_values( array_unique( array_map( 'absint', $course_ids ) ) );
	$csv_ids    = implode( ',', $course_ids );
	$json_ids   = wp_json_encode( $course_ids );
	$template   = d360_bridge_find_bundle_template_post( $bundle_id );

	if ( $template instanceof WP_Post ) {
		d360_bridge_clone_bundle_course_meta_from_template( $bundle_id, $template->ID, $course_ids );
	}

	$meta_keys = array(
		'bundle-course-ids',
		'_tutor_bundle_course_ids',
		'tutor_bundle_course_ids',
		'_tutor_bundle_courses',
		'tutor_bundle_courses',
		'_bundle_course_ids',
		'bundle_course_ids',
		'_course_bundle_ids',
		'course_bundle_ids',
		'_course_ids',
		'course_ids',
		'courses',
		'd360_bundle_course_ids',
	);

	foreach ( $meta_keys as $meta_key ) {
		$use_csv_value = 'bundle-course-ids' === $meta_key;
		update_post_meta( $bundle_id, $meta_key, $use_csv_value ? $csv_ids : $course_ids );
		update_post_meta( $bundle_id, $meta_key . '_count', count( $course_ids ) );
		update_post_meta( $bundle_id, $meta_key . '_list', $csv_ids );
		update_post_meta( $bundle_id, $meta_key . '_raw', $csv_ids );
		update_post_meta( $bundle_id, $meta_key . '_csv', $csv_ids );
		update_post_meta( $bundle_id, $meta_key . '_json', $json_ids );
	}
}

function d360_bridge_build_bundle_meta_input( $course_ids, $visibility ) {
	$course_ids = array_values( array_unique( array_map( 'absint', $course_ids ) ) );
	$csv_ids    = implode( ',', $course_ids );
	$json_ids   = wp_json_encode( $course_ids );

	return array(
		'bundle-course-ids'         => $csv_ids,
		'd360_managed_bundle'        => 1,
		'd360_bundle_visibility'     => $visibility,
		'd360_bundle_course_ids'     => $course_ids,
		'd360_bundle_course_ids_csv' => $csv_ids,
		'd360_bundle_course_ids_json'=> $json_ids,
		'd360_bundle_course_count'   => count( $course_ids ),
		'_tutor_course_type'         => 'bundle',
		'tutor_course_type'          => 'bundle',
		'_course_type'               => 'bundle',
		'course_type'                => 'bundle',
	);
}

function d360_bridge_safe_get_permalink( $post_id ) {
	$post_id = absint( $post_id );
	if ( ! $post_id ) {
		return '';
	}

	$permalink = get_permalink( $post_id );
	return is_string( $permalink ) ? $permalink : '';
}

function d360_bridge_clone_bundle_course_meta_from_template( $bundle_id, $template_id, $course_ids ) {
	$bundle_id   = absint( $bundle_id );
	$template_id = absint( $template_id );
	$course_ids  = array_values( array_unique( array_map( 'absint', $course_ids ) ) );

	if ( ! $bundle_id || ! $template_id || empty( $course_ids ) ) {
		return;
	}

	$template_meta = get_post_meta( $template_id );
	if ( ! is_array( $template_meta ) || empty( $template_meta ) ) {
		return;
	}

	foreach ( $template_meta as $meta_key => $raw_values ) {
		if ( ! is_string( $meta_key ) ) {
			continue;
		}

		$normalized_key = strtolower( $meta_key );
		$is_bundle_type = false !== strpos( $normalized_key, 'course_type' );
		$is_course_meta = false !== strpos( $normalized_key, 'bundle' ) && false !== strpos( $normalized_key, 'course' );

		if ( ! $is_bundle_type && ! $is_course_meta ) {
			continue;
		}

		if ( $is_bundle_type ) {
			update_post_meta( $bundle_id, $meta_key, 'bundle' );
			continue;
		}

		if ( ! is_array( $raw_values ) || empty( $raw_values ) ) {
			continue;
		}

		$template_value = maybe_unserialize( $raw_values[0] );
		$adapted_value  = d360_bridge_adapt_bundle_meta_value_from_template( $meta_key, $template_value, $course_ids );

		if ( null === $adapted_value ) {
			continue;
		}

		update_post_meta( $bundle_id, $meta_key, $adapted_value );
	}
}

function d360_bridge_adapt_bundle_meta_value_from_template( $meta_key, $template_value, $course_ids ) {
	$normalized_key = strtolower( (string) $meta_key );
	$course_ids     = array_values( array_unique( array_map( 'absint', $course_ids ) ) );

	if ( false !== strpos( $normalized_key, 'count' ) ) {
		return count( $course_ids );
	}

	if ( is_array( $template_value ) ) {
		$is_numeric_list = ! empty( $template_value );
		foreach ( $template_value as $item ) {
			if ( is_array( $item ) ) {
				$is_numeric_list = false;
				break;
			}
			if ( ! is_numeric( $item ) && ! ( is_string( $item ) && ctype_digit( $item ) ) ) {
				$is_numeric_list = false;
				break;
			}
		}

		if ( $is_numeric_list ) {
			return $course_ids;
		}
	}

	if ( is_string( $template_value ) ) {
		$trimmed = trim( $template_value );

		if ( '' === $trimmed ) {
			return implode( ',', $course_ids );
		}

		if ( preg_match( '/^\d+(,\d+)*$/', $trimmed ) ) {
			return implode( ',', $course_ids );
		}

		if ( '[' === substr( $trimmed, 0, 1 ) && ']' === substr( $trimmed, -1 ) ) {
			return wp_json_encode( $course_ids );
		}
	}

	return null;
}

function d360_bridge_debug_collect_post_meta( $post_id ) {
	$post_id  = absint( $post_id );
	$raw_meta = get_post_meta( $post_id );
	$result   = array();

	if ( ! is_array( $raw_meta ) ) {
		return $result;
	}

	foreach ( $raw_meta as $meta_key => $values ) {
		if ( ! is_string( $meta_key ) || ! is_array( $values ) || empty( $values ) ) {
			continue;
		}

		$parsed_values = array();

		foreach ( $values as $value ) {
			$parsed_values[] = d360_bridge_debug_normalize_meta_value( maybe_unserialize( $value ) );
		}

		$result[ $meta_key ] = 1 === count( $parsed_values ) ? $parsed_values[0] : $parsed_values;
	}

	ksort( $result );

	return $result;
}

function d360_bridge_debug_normalize_meta_value( $value ) {
	if ( is_scalar( $value ) || null === $value ) {
		return $value;
	}

	if ( is_array( $value ) ) {
		$normalized = array();

		foreach ( $value as $key => $item ) {
			$normalized[ $key ] = d360_bridge_debug_normalize_meta_value( $item );
		}

		return $normalized;
	}

	if ( is_object( $value ) ) {
		return d360_bridge_debug_normalize_meta_value( (array) $value );
	}

	return (string) $value;
}

function d360_bridge_debug_detect_bundle_courses_from_meta( $meta_snapshot ) {
	if ( ! is_array( $meta_snapshot ) ) {
		return array();
	}

	$detected = array();

	foreach ( $meta_snapshot as $meta_key => $value ) {
		if ( 0 === strpos( (string) $meta_key, 'd360_' ) ) {
			continue;
		}

		$course_ids = d360_bridge_debug_extract_course_ids_from_meta_value( $value );

		if ( empty( $course_ids ) ) {
			continue;
		}

		$detected[] = array(
			'meta_key'   => $meta_key,
			'course_ids' => $course_ids,
		);
	}

	return $detected;
}

function d360_bridge_debug_extract_course_ids_from_meta_value( $value ) {
	if ( is_int( $value ) || is_float( $value ) ) {
		return array();
	}

	if ( is_array( $value ) ) {
		$course_ids       = array();
		$is_numeric_array = ! empty( $value );

		foreach ( $value as $item ) {
			if ( is_array( $item ) || is_object( $item ) ) {
				$is_numeric_array = false;
				break;
			}

			if ( ! is_numeric( $item ) && ! ( is_string( $item ) && ctype_digit( trim( $item ) ) ) ) {
				$is_numeric_array = false;
				break;
			}
		}

		if ( $is_numeric_array ) {
			foreach ( $value as $item ) {
				$item = absint( $item );
				if ( $item ) {
					$course_ids[] = $item;
				}
			}

			return array_values( array_unique( $course_ids ) );
		}

		return array();
	}

	if ( ! is_string( $value ) ) {
		return array();
	}

	$trimmed = trim( $value );

	if ( '' === $trimmed ) {
		return array();
	}

	if ( preg_match( '/^\d+(,\d+)*$/', $trimmed ) ) {
		return array_values(
			array_unique(
				array_filter(
					array_map( 'absint', explode( ',', $trimmed ) )
				)
			)
		);
	}

	if ( '[' === substr( $trimmed, 0, 1 ) && ']' === substr( $trimmed, -1 ) ) {
		$decoded = json_decode( $trimmed, true );
		if ( is_array( $decoded ) ) {
			return d360_bridge_debug_extract_course_ids_from_meta_value( $decoded );
		}
	}

	return array();
}

function d360_bridge_enroll_single_course( $user_id, $course_id ) {
	$direct_access = d360_bridge_sync_direct_course_access( $user_id, $course_id );
	if ( ! is_wp_error( $direct_access ) ) {
		return true;
	}

	$response = d360_bridge_dispatch_tutor_request(
		'POST',
		'/tutor/v1/enrollments',
		array(
			'user_id'   => $user_id,
			'course_id' => $course_id,
		)
	);

	if ( is_wp_error( $response ) && d360_bridge_is_permission_error( $response ) ) {
		$response = d360_bridge_dispatch_tutor_http_request(
			'POST',
			'/tutor/v1/enrollments',
			array(
				'user_id'   => $user_id,
				'course_id' => $course_id,
			)
		);
	}

	if ( is_wp_error( $response ) ) {
		return $response;
	}

	return true;
}

function d360_bridge_batch_enrollments( WP_REST_Request $request ) {
	$params    = $request->get_json_params();
	$params    = is_array( $params ) ? $params : array();
	$user_id   = isset( $params['user_id'] ) ? absint( $params['user_id'] ) : 0;
	$course_ids = isset( $params['course_ids'] ) && is_array( $params['course_ids'] ) ? $params['course_ids'] : array();

	if ( ! $user_id || empty( $course_ids ) ) {
		return new WP_Error(
			'd360_bridge_invalid_enrollment',
			'user_id y course_ids son obligatorios.',
			array( 'status' => 400 )
		);
	}

	$enrolled = array();
	$failed   = array();

	foreach ( $course_ids as $course_id ) {
		$course_id = absint( $course_id );
		if ( ! $course_id ) {
			continue;
		}

		$result = d360_bridge_enroll_single_course( $user_id, $course_id );
		if ( is_wp_error( $result ) ) {
			$failed[] = array(
				'course_id' => $course_id,
				'message'   => $result->get_error_message(),
			);
			continue;
		}

		$enrolled[] = $course_id;
	}

	return rest_ensure_response(
		array(
			'user_id'            => $user_id,
			'enrolled_course_ids' => $enrolled,
			'failed_course_ids'   => $failed,
		)
	);
}

function d360_bridge_company_batch_enrollments( WP_REST_Request $request ) {
	$params   = $request->get_json_params();
	$params   = is_array( $params ) ? $params : array();
	$students = isset( $params['students'] ) && is_array( $params['students'] ) ? $params['students'] : array();

	if ( empty( $students ) ) {
		return new WP_Error(
			'd360_bridge_invalid_company_batch',
			'students es obligatorio y debe tener al menos un elemento.',
			array( 'status' => 400 )
		);
	}

	if ( count( $students ) > 25 ) {
		return new WP_Error(
			'd360_bridge_company_batch_too_large',
			'Maximo 25 estudiantes por lote.',
			array( 'status' => 400 )
		);
	}

	$results = array();

	foreach ( $students as $student ) {
		$student    = is_array( $student ) ? $student : array();
		$user_id    = isset( $student['user_id'] ) ? absint( $student['user_id'] ) : 0;
		$course_ids = isset( $student['course_ids'] ) && is_array( $student['course_ids'] ) ? $student['course_ids'] : array();

		if ( ! $user_id || empty( $course_ids ) ) {
			$results[] = array(
				'user_id'              => $user_id,
				'student_id'           => $user_id,
				'enrolled_course_ids'  => array(),
				'completed_course_ids' => array(),
				'already_active_ids'   => array(),
				'failed_course_ids'    => array(
					array(
						'course_id' => 0,
						'message'   => 'user_id y course_ids son obligatorios.',
					),
				),
			);
			continue;
		}

		$enrolled   = array();
		$completed  = array();
		$already_ok = array();
		$failed     = array();

		foreach ( $course_ids as $course_id ) {
			$course_id = absint( $course_id );
			if ( ! $course_id ) {
				continue;
			}

			$enroll_result = d360_bridge_enroll_single_course( $user_id, $course_id );
			if ( is_wp_error( $enroll_result ) ) {
				$failed[] = array(
					'course_id' => $course_id,
					'message'   => $enroll_result->get_error_message(),
				);
				continue;
			}
			$enrolled[] = $course_id;

			$access_result = d360_bridge_ensure_single_course_access( $user_id, $course_id );
			if ( is_wp_error( $access_result ) ) {
				$failed[] = array(
					'course_id' => $course_id,
					'message'   => $access_result->get_error_message(),
				);
				continue;
			}

			if ( 'already_active' === $access_result ) {
				$already_ok[] = $course_id;
			} else {
				$completed[] = $course_id;
			}
		}

		$results[] = array(
			'user_id'              => $user_id,
			'student_id'           => $user_id,
			'enrolled_course_ids'  => $enrolled,
			'completed_course_ids' => $completed,
			'already_active_ids'   => $already_ok,
			'failed_course_ids'    => $failed,
		);
	}

	return rest_ensure_response( array( 'students' => $results ) );
}

function d360_bridge_student_courses( WP_REST_Request $request ) {
	$student_id = absint( $request['student_id'] );

	$response = d360_bridge_dispatch_tutor_request(
		'GET',
		sprintf( '/tutor/v1/students/%d/courses', $student_id )
	);

	if ( is_wp_error( $response ) ) {
		$direct_courses = d360_bridge_get_direct_student_courses( $student_id );
		if ( ! empty( $direct_courses ) ) {
			$direct_courses = d360_bridge_enrich_student_courses_for_sync( $student_id, $direct_courses );

			return rest_ensure_response(
				array(
					'student_id' => $student_id,
					'courses'    => $direct_courses,
					'raw'        => array(
						'source' => 'direct_enrollment_fallback',
					),
				)
			);
		}

		return $response;
	}

	$normalized_courses = d360_bridge_normalize_courses( $response );
	if ( empty( $normalized_courses ) ) {
		$direct_courses = d360_bridge_get_direct_student_courses( $student_id );
		if ( ! empty( $direct_courses ) ) {
			$normalized_courses = $direct_courses;
		}
	}

	$normalized_courses = d360_bridge_enrich_student_courses_for_sync( $student_id, $normalized_courses );

	return rest_ensure_response(
		array(
			'student_id' => $student_id,
			'courses'    => $normalized_courses,
			'raw'        => $response,
		)
	);
}

function d360_bridge_student_dashboard( WP_REST_Request $request ) {
	$student_id = absint( $request['student_id'] );

	$response = d360_bridge_dispatch_tutor_request(
		'GET',
		sprintf( '/tutor/v1/students/%d/dashboard', $student_id )
	);

	if ( is_wp_error( $response ) ) {
		return $response;
	}

	return rest_ensure_response( $response );
}

function d360_bridge_student_certificates( WP_REST_Request $request ) {
	$student_id = absint( $request['student_id'] );

	$response = d360_bridge_dispatch_tutor_request(
		'GET',
		sprintf( '/tutor/v1/students/%d/courses', $student_id )
	);

	if ( is_wp_error( $response ) ) {
		$direct_courses = d360_bridge_get_direct_student_courses( $student_id );
		if ( empty( $direct_courses ) ) {
			return $response;
		}

		$response = array(
			'courses' => d360_bridge_enrich_student_courses_for_sync( $student_id, $direct_courses ),
		);
	}

	$certificates = array();

	foreach ( d360_bridge_enrich_student_courses_for_sync( $student_id, d360_bridge_normalize_courses( $response ) ) as $course ) {
		if ( empty( $course['completed'] ) ) {
			continue;
		}

		if ( empty( $course['certificate_url'] ) ) {
			continue;
		}

		$certificates[] = array(
			'wp_course_id'    => $course['wp_course_id'],
			'title'           => $course['title'],
			'certificate_url' => $course['certificate_url'],
			'completed_at'    => $course['completed_at'],
		);
	}

	return rest_ensure_response(
		array(
			'student_id'   => $student_id,
			'certificates' => $certificates,
		)
	);
}

function d360_bridge_student_diagnostics( WP_REST_Request $request ) {
	$student_id = absint( $request['student_id'] );
	$course_id  = absint( $request->get_param( 'course_id' ) );

	$rest_response = d360_bridge_dispatch_tutor_request(
		'GET',
		sprintf( '/tutor/v1/students/%d/courses', $student_id )
	);

	$rest_courses     = array();
	$rest_error       = null;
	$rest_normalized  = array();
	$direct_courses   = d360_bridge_get_direct_student_courses( $student_id );
	$course_snapshots = array();

	if ( is_wp_error( $rest_response ) ) {
		$rest_error = d360_bridge_error_to_debug_data( $rest_response );
	} else {
		$rest_courses    = $rest_response;
		$rest_normalized = d360_bridge_normalize_courses( $rest_response );
	}

	foreach ( $rest_normalized as $course ) {
		if ( empty( $course['wp_course_id'] ) ) {
			continue;
		}

		$current_course_id = (int) $course['wp_course_id'];
		if ( $course_id && $course_id !== $current_course_id ) {
			continue;
		}

		if ( ! isset( $course_snapshots[ $current_course_id ] ) ) {
			$course_snapshots[ $current_course_id ] = array(
				'wp_course_id'     => $current_course_id,
				'title'            => isset( $course['title'] ) ? $course['title'] : '',
				'rest_snapshot'    => null,
				'direct_snapshot'  => null,
				'calculated'       => null,
				'enrollment'       => null,
			);
		}

		$course_snapshots[ $current_course_id ]['rest_snapshot'] = $course;
	}

	foreach ( $direct_courses as $course ) {
		if ( empty( $course['wp_course_id'] ) ) {
			continue;
		}

		$current_course_id = (int) $course['wp_course_id'];
		if ( $course_id && $course_id !== $current_course_id ) {
			continue;
		}

		if ( ! isset( $course_snapshots[ $current_course_id ] ) ) {
			$course_snapshots[ $current_course_id ] = array(
				'wp_course_id'     => $current_course_id,
				'title'            => isset( $course['title'] ) ? $course['title'] : '',
				'rest_snapshot'    => null,
				'direct_snapshot'  => null,
				'calculated'       => null,
				'enrollment'       => null,
			);
		}

		$course_snapshots[ $current_course_id ]['direct_snapshot'] = $course;
	}

	if ( $course_id && ! isset( $course_snapshots[ $course_id ] ) ) {
		$course_snapshots[ $course_id ] = array(
			'wp_course_id'     => $course_id,
			'title'            => get_the_title( $course_id ),
			'rest_snapshot'    => null,
			'direct_snapshot'  => null,
			'calculated'       => null,
			'enrollment'       => null,
		);
	}

	foreach ( $course_snapshots as $current_course_id => $snapshot ) {
		$course_snapshots[ $current_course_id ]['calculated'] = d360_bridge_get_course_progress_stats( $student_id, $current_course_id );
		$course_snapshots[ $current_course_id ]['enrollment'] = d360_bridge_get_enrollment_debug_data( $student_id, $current_course_id );
		$course_snapshots[ $current_course_id ]['certificate'] = d360_bridge_get_course_certificate_debug_data( $student_id, $current_course_id );
	}

	return rest_ensure_response(
		array(
			'student_id'            => $student_id,
			'plugin_version'        => D360_BRIDGE_VERSION,
			'service_user_id'       => d360_bridge_get_service_user_id(),
			'course_filter'         => $course_id ? $course_id : null,
			'tutor_courses_error'   => $rest_error,
			'tutor_courses_raw'     => $rest_courses,
			'tutor_courses_count'   => count( $rest_normalized ),
			'direct_courses_count'  => count( $direct_courses ),
			'courses'               => array_values( $course_snapshots ),
		)
	);
}

function d360_bridge_ensure_single_course_access( $student_id, $course_id ) {
	$direct_access = d360_bridge_sync_direct_course_access( $student_id, $course_id );
	if ( ! is_wp_error( $direct_access ) ) {
		return ! empty( $direct_access['already_completed'] ) ? 'already_active' : 'completed';
	}

	$enrollments_response = d360_bridge_dispatch_tutor_request(
		'GET',
		'/tutor/v1/enrollments',
		array(
			'course_id' => $course_id,
		)
	);

	if ( is_wp_error( $enrollments_response ) && d360_bridge_is_permission_error( $enrollments_response ) ) {
		$enrollments_response = d360_bridge_dispatch_tutor_http_request(
			'GET',
			'/tutor/v1/enrollments',
			array(
				'course_id' => $course_id,
			)
		);
	}

	if ( is_wp_error( $enrollments_response ) ) {
		return $enrollments_response;
	}

	$matched_enrollment = d360_bridge_find_student_enrollment( $student_id, $course_id, $enrollments_response );

	if ( empty( $matched_enrollment ) || empty( $matched_enrollment['enrollment_id'] ) ) {
		return new WP_Error(
			'd360_bridge_no_enrollment',
			'Tutor LMS no devolvio una matricula utilizable para este alumno.'
		);
	}

	$status = isset( $matched_enrollment['status'] ) ? strtolower( (string) $matched_enrollment['status'] ) : '';
	if ( 'completed' === $status ) {
		return 'already_active';
	}

	$complete_response = d360_bridge_dispatch_tutor_request(
		'PUT',
		'/tutor/v1/enrollments/completed',
		array(
			'enrollment_id' => (int) $matched_enrollment['enrollment_id'],
			'status'        => 'completed',
		)
	);

	if ( is_wp_error( $complete_response ) && d360_bridge_is_permission_error( $complete_response ) ) {
		$complete_response = d360_bridge_dispatch_tutor_http_request(
			'PUT',
			'/tutor/v1/enrollments/completed',
			array(
				'enrollment_id' => (int) $matched_enrollment['enrollment_id'],
				'status'        => 'completed',
			)
		);
	}

	if ( is_wp_error( $complete_response ) ) {
		return $complete_response;
	}

	return 'completed';
}

function d360_bridge_ensure_student_access( WP_REST_Request $request ) {
	$student_id = absint( $request['student_id'] );
	$params     = $request->get_json_params();
	$params     = is_array( $params ) ? $params : array();
	$course_ids = isset( $params['course_ids'] ) && is_array( $params['course_ids'] ) ? $params['course_ids'] : array();

	if ( ! $student_id || empty( $course_ids ) ) {
		return new WP_Error(
			'd360_bridge_invalid_access_ensure',
			'student_id y course_ids son obligatorios.',
			array( 'status' => 400 )
		);
	}

	$completed = array();
	$already_ok = array();
	$failed = array();

	foreach ( $course_ids as $course_id ) {
		$course_id = absint( $course_id );

		if ( ! $course_id ) {
			continue;
		}

		$result = d360_bridge_ensure_single_course_access( $student_id, $course_id );

		if ( is_wp_error( $result ) ) {
			$failed[] = array(
				'course_id' => $course_id,
				'message'   => $result->get_error_message(),
			);
			continue;
		}

		if ( 'already_active' === $result ) {
			$already_ok[] = $course_id;
		} else {
			$completed[] = $course_id;
		}
	}

	return rest_ensure_response(
		array(
			'student_id'         => $student_id,
			'completed_course_ids' => $completed,
			'already_active_ids'   => $already_ok,
			'failed_course_ids'    => $failed,
		)
	);
}

function d360_bridge_get_course_progress_stats( $student_id, $course_id ) {
	$student_id = absint( $student_id );
	$course_id  = absint( $course_id );

	if ( ! $student_id || ! $course_id || ! function_exists( 'tutor_utils' ) ) {
		return array();
	}

	$tutor_utils = tutor_utils();
	if ( ! is_object( $tutor_utils ) ) {
		return array();
	}

	$original_user_id = get_current_user_id();
	$original_post    = isset( $GLOBALS['post'] ) ? $GLOBALS['post'] : null;
	$course_post      = get_post( $course_id );

	wp_set_current_user( $student_id );

	if ( $course_post instanceof WP_Post ) {
		$GLOBALS['post'] = $course_post;
		setup_postdata( $course_post );
	}

	$progress_pct     = 0;
	$completed_count  = 0;
	$total_count      = 0;
	$lesson_completed = 0;
	$lesson_total     = 0;
	$quiz_total       = 0;
	$assignment_total = 0;
	$progress_data    = null;
	$content_lessons  = 0;

	if ( method_exists( $tutor_utils, 'get_course_completed_percent' ) ) {
		$progress_data = d360_bridge_call_tutor_utils_method( $tutor_utils, 'get_course_completed_percent', array( $course_id, $student_id, true ) );

		if ( is_array( $progress_data ) ) {
			$progress_pct    = isset( $progress_data['completed_percent'] ) ? (int) $progress_data['completed_percent'] : 0;
			$completed_count = isset( $progress_data['completed_count'] ) ? (int) $progress_data['completed_count'] : 0;
			$total_count     = isset( $progress_data['total_count'] ) ? (int) $progress_data['total_count'] : 0;
		} else {
			$progress_pct = (int) $progress_data;
		}
	}

	if ( method_exists( $tutor_utils, 'get_completed_lesson_count_by_course' ) ) {
		$lesson_completed = (int) d360_bridge_call_tutor_utils_method(
			$tutor_utils,
			'get_completed_lesson_count_by_course',
			array( $course_id, $student_id )
		);
	}

	if ( method_exists( $tutor_utils, 'get_lesson_count_by_course' ) ) {
		$lesson_total = (int) d360_bridge_call_tutor_utils_method(
			$tutor_utils,
			'get_lesson_count_by_course',
			array( $course_id )
		);
	}

	if ( method_exists( $tutor_utils, 'get_course_contents_by_id' ) ) {
		$course_contents = d360_bridge_call_tutor_utils_method( $tutor_utils, 'get_course_contents_by_id', array( $course_id ) );

		if ( is_array( $course_contents ) || $course_contents instanceof Traversable ) {
			foreach ( $course_contents as $content ) {
				if ( ! $content instanceof WP_Post ) {
					continue;
				}

				if ( 'tutor_quiz' === $content->post_type ) {
					++$quiz_total;
					continue;
				}

				if ( 'tutor_assignments' === $content->post_type ) {
					++$assignment_total;
					continue;
				}

				++$content_lessons;
			}
		}
	}

	if ( $lesson_total <= 0 && $content_lessons > 0 ) {
		$lesson_total = $content_lessons;
	}

	if ( $lesson_total > 0 ) {
		$progress_pct = (int) round( ( $lesson_completed / $lesson_total ) * 100 );
	}

	$started_at = null;
	$completed_at = null;
	$enrollment_id = d360_bridge_find_enrollment_post_id( $student_id, $course_id );

	if ( $enrollment_id ) {
		$enrollment = get_post( $enrollment_id );

		if ( $enrollment instanceof WP_Post ) {
			$started_at = d360_bridge_mysql_gmt_to_iso( $enrollment->post_date_gmt );
		}
	}

	if ( $progress_pct >= 100 ) {
		$completed_at = d360_bridge_find_course_completion_date( $student_id, $course_id );
	}

	if ( $course_post instanceof WP_Post ) {
		wp_reset_postdata();
	}

	if ( $original_post instanceof WP_Post ) {
		$GLOBALS['post'] = $original_post;
	} else {
		unset( $GLOBALS['post'] );
	}

	wp_set_current_user( $original_user_id );

	return array(
		'progress_pct'       => max( 0, min( 100, $progress_pct ) ),
		'completed'          => $progress_pct >= 100,
		'completed_count'    => $completed_count,
		'total_count'        => $total_count,
		'lesson_completed'   => $lesson_completed,
		'lesson_total'       => $lesson_total,
		'content_lessons'    => $content_lessons,
		'quiz_total'         => $quiz_total,
		'assignment_total'   => $assignment_total,
		'started_at'         => $started_at,
		'completed_at'       => $completed_at,
		'raw_progress_data'  => $progress_data,
	);
}

function d360_bridge_resolve_course_certificate_url( $student_id, $course_id ) {
	$student_id = absint( $student_id );
	$course_id  = absint( $course_id );

	if ( ! $student_id || ! $course_id ) {
		return null;
	}

	$public_certificate_url = d360_bridge_find_certificate_public_url_via_hash( $student_id, $course_id );
	if ( $public_certificate_url ) {
		return $public_certificate_url;
	}

	$public_certificate_url = d360_bridge_find_certificate_public_url_from_student_pages( $student_id, $course_id );
	if ( $public_certificate_url ) {
		return $public_certificate_url;
	}

	$attachment_id = d360_bridge_find_certificate_attachment_id( $student_id, $course_id );
	if ( $attachment_id ) {
		$attachment_url = wp_get_attachment_url( $attachment_id );
		if ( $attachment_url ) {
			return $attachment_url;
		}
	}

	return null;
}

function d360_bridge_find_certificate_public_url_via_hash( $student_id, $course_id ) {
	$cert_hash = d360_bridge_find_course_certificate_hash( $student_id, $course_id );
	if ( ! $cert_hash ) {
		return null;
	}

	return d360_bridge_build_certificate_public_url( $cert_hash );
}

function d360_bridge_build_certificate_public_url( $cert_hash ) {
	$cert_hash = is_string( $cert_hash ) ? trim( $cert_hash ) : '';
	if ( '' === $cert_hash ) {
		return null;
	}

	$public_url = apply_filters( 'tutor_certificate_public_url', '', $cert_hash );
	if ( is_string( $public_url ) ) {
		$public_url = trim( $public_url );
		if ( '' !== $public_url && d360_bridge_certificate_url_matches_hash( $public_url, $cert_hash ) ) {
			return $public_url;
		}
	}

	return add_query_arg(
		array(
			'cert_hash' => $cert_hash,
		),
		home_url( '/tutor-certificate/' )
	);
}

function d360_bridge_certificate_url_matches_hash( $url, $cert_hash ) {
	$url       = is_string( $url ) ? trim( $url ) : '';
	$cert_hash = is_string( $cert_hash ) ? trim( $cert_hash ) : '';

	if ( '' === $url || '' === $cert_hash ) {
		return false;
	}

	$query = wp_parse_url( $url, PHP_URL_QUERY );
	if ( ! is_string( $query ) || '' === $query ) {
		return false;
	}

	$params = array();
	parse_str( $query, $params );

	return isset( $params['cert_hash'] ) && $cert_hash === (string) $params['cert_hash'];
}

function d360_bridge_find_course_certificate_hash( $student_id, $course_id ) {
	global $wpdb;

	$student_id = absint( $student_id );
	$course_id  = absint( $course_id );

	if ( ! $student_id || ! $course_id ) {
		return null;
	}

	$tables = $wpdb->get_col( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $wpdb->prefix ) . '%' ) );
	if ( empty( $tables ) ) {
		return null;
	}

	$hash_columns = array( 'cert_hash', 'certificate_hash', 'verification_id', 'hash', 'certificate_code', 'unique_id' );
	$user_columns = array( 'completed_user_id', 'user_id', 'student_id', 'author', 'completed_by' );
	$course_columns = array( 'course_id', 'post_id', 'completed_course_id', 'item_id' );
	$date_columns = array( 'completion_date', 'completed_at', 'created_at', 'date_created', 'ID' );

	foreach ( $tables as $table_name ) {
		$columns = $wpdb->get_results( "SHOW COLUMNS FROM `{$table_name}`", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		if ( empty( $columns ) ) {
			continue;
		}

		$column_names = array_map(
			static function( $column ) {
				return isset( $column['Field'] ) ? (string) $column['Field'] : '';
			},
			$columns
		);

		$hash_column = d360_bridge_find_first_matching_column( $column_names, $hash_columns );
		$user_column = d360_bridge_find_first_matching_column( $column_names, $user_columns );
		$course_column = d360_bridge_find_first_matching_column( $column_names, $course_columns );

		if ( ! $hash_column || ! $user_column || ! $course_column ) {
			continue;
		}

		$order_column = d360_bridge_find_first_matching_column( $column_names, $date_columns );
		$sql = "SELECT `{$hash_column}` FROM `{$table_name}` WHERE `{$user_column}` = %d AND `{$course_column}` = %d"; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		if ( $order_column ) {
			$sql .= " ORDER BY `{$order_column}` DESC"; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		}
		$sql .= ' LIMIT 1';

		$cert_hash = $wpdb->get_var(
			$wpdb->prepare(
				$sql,
				$student_id,
				$course_id
			)
		);

		if ( is_string( $cert_hash ) && '' !== trim( $cert_hash ) ) {
			return trim( $cert_hash );
		}
	}

	$candidate_hashes = d360_bridge_find_candidate_certificate_hashes_by_user( $student_id );
	foreach ( $candidate_hashes as $candidate_hash ) {
		$completion_data = apply_filters( 'tutor_certificate_completion_data', $candidate_hash );

		if ( ! is_object( $completion_data ) || ! property_exists( $completion_data, 'course_id' ) ) {
			continue;
		}

		if ( (int) $completion_data->course_id !== $course_id ) {
			continue;
		}

		$completed_user_id = property_exists( $completion_data, 'completed_user_id' ) ? (int) $completion_data->completed_user_id : 0;
		if ( $completed_user_id && $completed_user_id !== $student_id ) {
			continue;
		}

		return $candidate_hash;
	}

	return null;
}

function d360_bridge_normalize_datetime_to_iso( $value ) {
	if ( null === $value || '' === $value ) {
		return null;
	}

	if ( is_numeric( $value ) ) {
		$timestamp = (int) $value;
		if ( $timestamp > 1000000000 ) {
			return gmdate( 'c', $timestamp );
		}

		return null;
	}

	$value = is_string( $value ) ? trim( $value ) : '';
	if ( '' === $value ) {
		return null;
	}

	if ( preg_match( '/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/', $value ) ) {
		return mysql2date( 'c', $value, false );
	}

	$timestamp = strtotime( $value );
	if ( false === $timestamp ) {
		return null;
	}

	return gmdate( 'c', $timestamp );
}

function d360_bridge_mysql_gmt_to_iso( $value ) {
	$value = is_string( $value ) ? trim( $value ) : '';
	if ( '' === $value || '0000-00-00 00:00:00' === $value ) {
		return null;
	}

	$timestamp = strtotime( $value . ' UTC' );
	if ( false === $timestamp ) {
		return null;
	}

	return gmdate( 'c', $timestamp );
}

function d360_bridge_find_course_completion_date( $student_id, $course_id ) {
	global $wpdb;

	$student_id = absint( $student_id );
	$course_id  = absint( $course_id );

	if ( ! $student_id || ! $course_id ) {
		return null;
	}

	$tables = $wpdb->get_col( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $wpdb->prefix ) . '%' ) );
	if ( empty( $tables ) ) {
		return null;
	}

	$user_columns   = array( 'completed_user_id', 'user_id', 'student_id', 'author', 'completed_by' );
	$course_columns = array( 'course_id', 'post_id', 'completed_course_id', 'item_id' );
	$date_columns   = array( 'completion_date', 'completed_at', 'date_completed', 'issued_at', 'created_at', 'date_created' );

	foreach ( $tables as $table_name ) {
		$columns = $wpdb->get_results( "SHOW COLUMNS FROM `{$table_name}`", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		if ( empty( $columns ) ) {
			continue;
		}

		$column_names = array_map(
			static function( $column ) {
				return isset( $column['Field'] ) ? (string) $column['Field'] : '';
			},
			$columns
		);

		$user_column   = d360_bridge_find_first_matching_column( $column_names, $user_columns );
		$course_column = d360_bridge_find_first_matching_column( $column_names, $course_columns );
		$date_column   = d360_bridge_find_first_matching_column( $column_names, $date_columns );

		if ( ! $user_column || ! $course_column || ! $date_column ) {
			continue;
		}

		$sql = "SELECT `{$date_column}` FROM `{$table_name}` WHERE `{$user_column}` = %d AND `{$course_column}` = %d AND `{$date_column}` IS NOT NULL AND `{$date_column}` != '' ORDER BY `{$date_column}` DESC LIMIT 1"; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		$completion_date = $wpdb->get_var(
			$wpdb->prepare(
				$sql,
				$student_id,
				$course_id
			)
		);

		$normalized = d360_bridge_normalize_datetime_to_iso( $completion_date );
		if ( $normalized ) {
			return $normalized;
		}
	}

	$candidate_hashes = d360_bridge_find_candidate_certificate_hashes_by_user( $student_id );
	foreach ( $candidate_hashes as $candidate_hash ) {
		$completion_data = apply_filters( 'tutor_certificate_completion_data', $candidate_hash );

		if ( ! is_object( $completion_data ) || ! property_exists( $completion_data, 'course_id' ) ) {
			continue;
		}

		if ( (int) $completion_data->course_id !== $course_id ) {
			continue;
		}

		$completed_user_id = property_exists( $completion_data, 'completed_user_id' ) ? (int) $completion_data->completed_user_id : 0;
		if ( $completed_user_id && $completed_user_id !== $student_id ) {
			continue;
		}

		foreach ( array( 'completion_date', 'completed_at', 'date_completed', 'issued_at', 'created_at', 'date_created' ) as $property_name ) {
			if ( ! property_exists( $completion_data, $property_name ) ) {
				continue;
			}

			$normalized = d360_bridge_normalize_datetime_to_iso( $completion_data->{$property_name} );
			if ( $normalized ) {
				return $normalized;
			}
		}
	}

	$latest_completed_content_date = d360_bridge_find_latest_completed_content_date( $student_id, $course_id );
	if ( $latest_completed_content_date ) {
		return $latest_completed_content_date;
	}

	return null;
}

function d360_bridge_find_latest_completed_content_date( $student_id, $course_id ) {
	global $wpdb;

	$student_id = absint( $student_id );
	$course_id  = absint( $course_id );

	if ( ! $student_id || ! $course_id ) {
		return null;
	}

	$content_ids = d360_bridge_get_course_content_ids( $course_id );
	if ( empty( $content_ids ) ) {
		return null;
	}

	$placeholders = implode( ',', array_fill( 0, count( $content_ids ), '%d' ) );
	$sql          = "SELECT comment_date_gmt FROM {$wpdb->comments} WHERE user_id = %d AND comment_post_ID IN ({$placeholders}) AND comment_date_gmt IS NOT NULL AND comment_date_gmt != '0000-00-00 00:00:00' ORDER BY comment_date_gmt DESC LIMIT 1"; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	$params       = array_merge( array( $student_id ), $content_ids );
	$prepared     = call_user_func_array( array( $wpdb, 'prepare' ), array_merge( array( $sql ), $params ) );
	$latest_date  = $wpdb->get_var( $prepared ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	$normalized   = d360_bridge_mysql_gmt_to_iso( $latest_date );

	return $normalized ? $normalized : null;
}

function d360_bridge_get_course_content_ids( $course_id ) {
	$course_id = absint( $course_id );
	if ( ! $course_id ) {
		return array();
	}

	$content_ids = array();
	$tutor_utils = function_exists( 'tutor_utils' ) ? tutor_utils() : null;

	if ( $tutor_utils && method_exists( $tutor_utils, 'get_course_contents_by_id' ) ) {
		$course_contents = d360_bridge_call_tutor_utils_method( $tutor_utils, 'get_course_contents_by_id', array( $course_id ) );

		if ( is_array( $course_contents ) || $course_contents instanceof Traversable ) {
			foreach ( $course_contents as $content ) {
				if ( $content instanceof WP_Post ) {
					$content_ids[] = (int) $content->ID;
				}
			}
		}
	}

	$frontier = array( $course_id );
	for ( $depth = 0; $depth < 5; $depth++ ) {
		$children = get_posts(
			array(
				'post_parent__in' => $frontier,
				'post_type'       => 'any',
				'post_status'     => 'any',
				'fields'          => 'ids',
				'numberposts'     => -1,
				'no_found_rows'   => true,
			)
		);

		if ( empty( $children ) ) {
			break;
		}

		$children    = array_map( 'absint', $children );
		$content_ids = array_merge( $content_ids, $children );
		$frontier    = $children;
	}

	$content_ids = array_values(
		array_unique(
			array_filter(
				$content_ids,
				static function( $content_id ) use ( $course_id ) {
					return $content_id && $content_id !== $course_id;
				}
			)
		)
	);

	return $content_ids;
}

function d360_bridge_find_candidate_certificate_hashes_by_user( $student_id ) {
	global $wpdb;

	$student_id = absint( $student_id );
	if ( ! $student_id ) {
		return array();
	}

	$tables = $wpdb->get_col( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $wpdb->prefix ) . '%' ) );
	if ( empty( $tables ) ) {
		return array();
	}

	$hash_candidates = array();
	$hash_columns = array( 'cert_hash', 'certificate_hash', 'verification_id', 'hash', 'certificate_code', 'unique_id' );
	$user_columns = array( 'completed_user_id', 'user_id', 'student_id', 'author', 'completed_by' );
	$date_columns = array( 'completion_date', 'completed_at', 'created_at', 'date_created', 'ID' );

	foreach ( $tables as $table_name ) {
		$columns = $wpdb->get_results( "SHOW COLUMNS FROM `{$table_name}`", ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		if ( empty( $columns ) ) {
			continue;
		}

		$column_names = array_map(
			static function( $column ) {
				return isset( $column['Field'] ) ? (string) $column['Field'] : '';
			},
			$columns
		);

		$hash_column = d360_bridge_find_first_matching_column( $column_names, $hash_columns );
		$user_column = d360_bridge_find_first_matching_column( $column_names, $user_columns );

		if ( ! $hash_column || ! $user_column ) {
			continue;
		}

		$order_column = d360_bridge_find_first_matching_column( $column_names, $date_columns );
		$sql = "SELECT `{$hash_column}` FROM `{$table_name}` WHERE `{$user_column}` = %d"; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		if ( $order_column ) {
			$sql .= " ORDER BY `{$order_column}` DESC"; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		}
		$sql .= ' LIMIT 25';

		$results = $wpdb->get_col(
			$wpdb->prepare(
				$sql,
				$student_id
			)
		);

		if ( empty( $results ) ) {
			continue;
		}

		foreach ( $results as $result ) {
			$result = is_string( $result ) ? trim( $result ) : '';
			if ( '' === $result ) {
				continue;
			}

			$hash_candidates[ $result ] = true;
		}
	}

	return array_keys( $hash_candidates );
}

function d360_bridge_find_first_matching_column( $column_names, $candidates ) {
	foreach ( $candidates as $candidate ) {
		if ( in_array( $candidate, $column_names, true ) ) {
			return $candidate;
		}
	}

	return null;
}

function d360_bridge_find_certificate_attachment_id( $student_id, $course_id ) {
	global $wpdb;

	$student_id = absint( $student_id );
	$course_id  = absint( $course_id );

	if ( ! $student_id || ! $course_id ) {
		return 0;
	}

	$candidate_names = array(
		'certificate_' . $course_id . '_' . $student_id,
		'certificate-' . $course_id . '-' . $student_id,
		sanitize_title( 'certificate ' . $course_id . ' ' . $student_id ),
	);

	foreach ( $candidate_names as $candidate_name ) {
		$attachment_id = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT ID
				FROM {$wpdb->posts}
				WHERE post_type = 'attachment'
					AND post_parent = %d
					AND post_author = %d
					AND post_name = %s
				ORDER BY ID DESC
				LIMIT 1",
				$course_id,
				$student_id,
				$candidate_name
			)
		);

		if ( $attachment_id ) {
			return (int) $attachment_id;
		}
	}

	$attachment_id = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT p.ID
			FROM {$wpdb->posts} p
			INNER JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID
			WHERE p.post_type = 'attachment'
				AND p.post_parent = %d
				AND p.post_author = %d
				AND pm.meta_key = '_wp_attached_file'
				AND (
					pm.meta_value LIKE %s
					OR pm.meta_value LIKE %s
				)
			ORDER BY p.ID DESC
			LIMIT 1",
			$course_id,
			$student_id,
			'%certificate%',
			'%.pdf'
		)
	);

	if ( $attachment_id ) {
		return (int) $attachment_id;
	}

	$attachments = get_children(
		array(
			'post_parent'    => $course_id,
			'post_type'      => 'attachment',
			'author'         => $student_id,
			'post_status'    => 'inherit',
			'posts_per_page' => -1,
			'orderby'        => 'ID',
			'order'          => 'DESC',
			'fields'         => 'ids',
		)
	);

	if ( empty( $attachments ) ) {
		return 0;
	}

	foreach ( $attachments as $attachment_id ) {
		$mime_type = get_post_mime_type( $attachment_id );
		$file_path = (string) get_post_meta( $attachment_id, '_wp_attached_file', true );

		if ( 'application/pdf' === $mime_type || false !== stripos( $file_path, 'certificate' ) ) {
			return (int) $attachment_id;
		}
	}

	return 0;
}

function d360_bridge_get_course_certificate_debug_data( $student_id, $course_id ) {
	$cert_hash = d360_bridge_find_course_certificate_hash( $student_id, $course_id );
	$attachment_id = d360_bridge_find_certificate_attachment_id( $student_id, $course_id );
	$page_probe = d360_bridge_probe_student_certificate_pages( $student_id, $course_id );
	$course_page_url = ! empty( $page_probe['course_page_url'] ) ? $page_probe['course_page_url'] : null;

	if ( ! $cert_hash && ! empty( $page_probe['matched_hash'] ) ) {
		$cert_hash = $page_probe['matched_hash'];
	}

	$public_url = $cert_hash ? d360_bridge_build_certificate_public_url( $cert_hash ) : null;
	if ( $course_page_url && ( ! $public_url || ! d360_bridge_certificate_url_matches_hash( $public_url, $cert_hash ) ) ) {
		$public_url = $course_page_url;
	}

	return array(
		'cert_hash'        => $cert_hash,
		'public_url'       => $public_url,
		'course_page_url'  => $course_page_url,
		'page_probe'       => $page_probe,
		'attachment_id'    => $attachment_id ? $attachment_id : null,
		'attachment_url'   => $attachment_id ? wp_get_attachment_url( $attachment_id ) : null,
	);
}

function d360_bridge_find_certificate_public_url_from_student_pages( $student_id, $course_id ) {
	$page_probe = d360_bridge_probe_student_certificate_pages( $student_id, $course_id );

	if ( ! empty( $page_probe['matched_public_url'] ) ) {
		return $page_probe['matched_public_url'];
	}

	if ( ! empty( $page_probe['course_page_url'] ) ) {
		return $page_probe['course_page_url'];
	}

	return null;
}

function d360_bridge_probe_student_certificate_pages( $student_id, $course_id ) {
	static $cache = array();

	$student_id = absint( $student_id );
	$course_id  = absint( $course_id );

	if ( ! $student_id || ! $course_id ) {
		return array(
			'matched_hash'       => null,
			'matched_public_url' => null,
			'course_page_url'    => null,
			'pages'              => array(),
		);
	}

	$cache_key = $student_id . ':' . $course_id;
	if ( isset( $cache[ $cache_key ] ) ) {
		return $cache[ $cache_key ];
	}

	$expiration = time() + HOUR_IN_SECONDS;
	$logged_in_cookie = wp_generate_auth_cookie( $student_id, $expiration, 'logged_in' );
	if ( ! $logged_in_cookie ) {
		$cache[ $cache_key ] = array(
			'matched_hash'       => null,
			'matched_public_url' => null,
			'course_page_url'    => null,
			'pages'              => array(
				array(
					'label'  => 'auth_cookie',
					'status' => 'missing',
				),
			),
		);

		return $cache[ $cache_key ];
	}

	$result = array(
		'matched_hash'       => null,
		'matched_public_url' => null,
		'course_page_url'    => null,
		'pages'              => array(),
	);

	$candidate_urls = d360_bridge_get_student_certificate_candidate_urls( $course_id );
	foreach ( $candidate_urls as $candidate ) {
		$response = wp_remote_get(
			$candidate['url'],
			array(
				'timeout' => 20,
				'headers' => array(
					'Cookie' => LOGGED_IN_COOKIE . '=' . $logged_in_cookie,
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			$result['pages'][] = array(
				'label'   => $candidate['label'],
				'url'     => $candidate['url'],
				'status'  => 'error',
				'message' => $response->get_error_message(),
			);
			continue;
		}

		$status_code = (int) wp_remote_retrieve_response_code( $response );
		$body        = wp_remote_retrieve_body( $response );
		$hashes      = d360_bridge_extract_certificate_hashes_from_html( $body );
		$matched_hash = d360_bridge_match_certificate_hash_for_course( $student_id, $course_id, $hashes );
		$matched_public_url = $matched_hash ? d360_bridge_build_certificate_public_url( $matched_hash ) : null;
		$course_page_match = null;

		$page_debug = array(
			'label'        => $candidate['label'],
			'url'          => $candidate['url'],
			'status'       => $status_code,
			'hashes_found' => array_slice( $hashes, 0, 10 ),
			'matched_hash' => $matched_hash,
		);

		if ( ! empty( $candidate['is_course_page'] ) ) {
			$course_page_match = d360_bridge_extract_first_certificate_url_from_html( $body );
			$page_debug['course_page_match'] = $course_page_match;

			if ( $course_page_match && empty( $result['course_page_url'] ) ) {
				$result['course_page_url'] = $course_page_match;
			}
		}

		$result['pages'][] = $page_debug;

		if ( $matched_hash && $matched_public_url ) {
			$result['matched_hash']       = $matched_hash;
			$result['matched_public_url'] = ( $course_page_match && d360_bridge_certificate_url_matches_hash( $course_page_match, $matched_hash ) )
				? $course_page_match
				: $matched_public_url;
			break;
		}
	}

	$cache[ $cache_key ] = $result;
	return $cache[ $cache_key ];
}

function d360_bridge_get_student_certificate_candidate_urls( $course_id ) {
	$course_id = absint( $course_id );
	$urls      = array();

	$course_url = $course_id ? get_permalink( $course_id ) : '';
	if ( is_string( $course_url ) && '' !== $course_url ) {
		$urls[ $course_url ] = array(
			'label'          => 'course_page',
			'url'            => $course_url,
			'is_course_page' => true,
		);
	}

	$dashboard_roots = array(
		home_url( '/dashboard/' ),
		home_url( '/student-dashboard/' ),
	);

	foreach ( $dashboard_roots as $dashboard_root ) {
		if ( ! is_string( $dashboard_root ) || '' === $dashboard_root ) {
			continue;
		}

		$paths = array(
			'' => 'dashboard_root',
			'certificate/' => 'dashboard_certificate',
			'certificates/' => 'dashboard_certificates',
			'my-courses/' => 'dashboard_my_courses',
			'enrolled-courses/' => 'dashboard_enrolled_courses',
			'completed-courses/' => 'dashboard_completed_courses',
		);

		foreach ( $paths as $suffix => $label ) {
			$url = '' === $suffix ? trailingslashit( $dashboard_root ) : trailingslashit( $dashboard_root ) . $suffix;
			$urls[ $url ] = array(
				'label'          => $label,
				'url'            => $url,
				'is_course_page' => false,
			);
		}
	}

	return array_values( $urls );
}

function d360_bridge_extract_certificate_hashes_from_html( $body ) {
	if ( ! is_string( $body ) || '' === $body ) {
		return array();
	}

	$matches = array();
	preg_match_all( '~cert_hash=([a-zA-Z0-9]+)~', html_entity_decode( $body ), $matches );

	if ( empty( $matches[1] ) || ! is_array( $matches[1] ) ) {
		return array();
	}

	$hashes = array();
	foreach ( $matches[1] as $hash ) {
		$hash = is_string( $hash ) ? trim( $hash ) : '';
		if ( '' === $hash ) {
			continue;
		}

		$hashes[ $hash ] = true;
	}

	return array_keys( $hashes );
}

function d360_bridge_match_certificate_hash_for_course( $student_id, $course_id, $hashes ) {
	$student_id = absint( $student_id );
	$course_id  = absint( $course_id );
	$hashes     = is_array( $hashes ) ? $hashes : array();

	if ( ! $student_id || ! $course_id || empty( $hashes ) ) {
		return null;
	}

	foreach ( $hashes as $hash ) {
		$completion_data = apply_filters( 'tutor_certificate_completion_data', $hash );

		if ( ! is_object( $completion_data ) || ! property_exists( $completion_data, 'course_id' ) ) {
			continue;
		}

		if ( (int) $completion_data->course_id !== $course_id ) {
			continue;
		}

		$completed_user_id = property_exists( $completion_data, 'completed_user_id' ) ? (int) $completion_data->completed_user_id : 0;
		if ( $completed_user_id && $completed_user_id !== $student_id ) {
			continue;
		}

		return $hash;
	}

	return null;
}

function d360_bridge_extract_first_certificate_url_from_html( $body ) {
	if ( ! is_string( $body ) || '' === $body ) {
		return null;
	}

	$patterns = array(
		'~https?://[^"\']+/tutor-certificate/\?cert_hash=[a-zA-Z0-9]+~',
		'~/tutor-certificate/\?cert_hash=[a-zA-Z0-9]+~',
		'~cert_hash=[a-zA-Z0-9]+~',
	);

	foreach ( $patterns as $pattern ) {
		if ( ! preg_match( $pattern, $body, $matches ) ) {
			continue;
		}

		$match = isset( $matches[0] ) ? html_entity_decode( (string) $matches[0] ) : '';
		if ( '' === $match ) {
			continue;
		}

		if ( false !== strpos( $match, 'cert_hash=' ) && 0 !== strpos( $match, 'http' ) && 0 !== strpos( $match, '/' ) ) {
			return add_query_arg(
				array(
					'cert_hash' => substr( $match, strlen( 'cert_hash=' ) ),
				),
				home_url( '/tutor-certificate/' )
			);
		}

		if ( 0 === strpos( $match, '/' ) ) {
			return home_url( $match );
		}

		return $match;
	}

	return null;
}

function d360_bridge_call_tutor_utils_method( $object, $method, $args = array() ) {
	if ( ! is_object( $object ) || ! method_exists( $object, $method ) ) {
		return null;
	}

	$args = is_array( $args ) ? array_values( $args ) : array();

	try {
		$reflection  = new ReflectionMethod( $object, $method );
		$param_count = $reflection->getNumberOfParameters();
		$invoke_args = array_slice( $args, 0, $param_count );

		return $reflection->invokeArgs( $object, $invoke_args );
	} catch ( Exception $exception ) {
		return null;
	}
}

function d360_bridge_error_to_debug_data( $error ) {
	if ( ! is_wp_error( $error ) ) {
		return null;
	}

	return array(
		'code'    => $error->get_error_code(),
		'message' => $error->get_error_message(),
		'data'    => $error->get_error_data(),
	);
}

function d360_bridge_get_enrollment_debug_data( $student_id, $course_id ) {
	$enrollment_id = d360_bridge_find_enrollment_post_id( $student_id, $course_id );

	if ( ! $enrollment_id ) {
		return null;
	}

	$enrollment = get_post( $enrollment_id );
	if ( ! $enrollment instanceof WP_Post ) {
		return null;
	}

	return array(
		'enrollment_id'   => $enrollment_id,
		'post_status'     => $enrollment->post_status,
		'post_date_gmt'   => $enrollment->post_date_gmt,
		'post_modified_gmt' => $enrollment->post_modified_gmt,
		'post_parent'     => $enrollment->post_parent,
		'author'          => $enrollment->post_author,
	);
}

function d360_bridge_sync_direct_course_access( $student_id, $course_id ) {
	$student_id = absint( $student_id );
	$course_id  = absint( $course_id );

	if ( ! $student_id || ! $course_id ) {
		return new WP_Error(
			'd360_bridge_invalid_direct_access',
			'student_id y course_id son obligatorios para sincronizar acceso.',
			array( 'status' => 400 )
		);
	}

	$enrollment_id = d360_bridge_find_enrollment_post_id( $student_id, $course_id );

	if ( ! $enrollment_id ) {
		$enroll_result = d360_bridge_create_direct_enrollment( $student_id, $course_id );
		if ( is_wp_error( $enroll_result ) ) {
			return $enroll_result;
		}

		$enrollment_id = d360_bridge_find_enrollment_post_id( $student_id, $course_id );
	}

	if ( ! $enrollment_id ) {
		return new WP_Error(
			'd360_bridge_missing_direct_enrollment',
			'Tutor LMS no creo una matricula local para este alumno.',
			array( 'status' => 500 )
		);
	}

	$enrollment = get_post( $enrollment_id );
	if ( ! $enrollment instanceof WP_Post ) {
		return new WP_Error(
			'd360_bridge_invalid_direct_enrollment',
			'La matricula localizada en Tutor LMS ya no existe.',
			array( 'status' => 500 )
		);
	}

	$current_status = is_string( $enrollment->post_status ) ? strtolower( $enrollment->post_status ) : '';
	if ( 'completed' === $current_status ) {
		return array(
			'enrollment_id'      => $enrollment_id,
			'already_completed'  => true,
			'created_enrollment' => false,
		);
	}

	$updated = wp_update_post(
		array(
			'ID'          => $enrollment_id,
			'post_status' => 'completed',
		),
		true
	);

	if ( is_wp_error( $updated ) ) {
		return new WP_Error(
			'd360_bridge_update_enrollment_failed',
			$updated->get_error_message(),
			array( 'status' => 500 )
		);
	}

	$verified_enrollment = get_post( $enrollment_id );
	$verified_status     = ( $verified_enrollment instanceof WP_Post && is_string( $verified_enrollment->post_status ) )
		? strtolower( $verified_enrollment->post_status )
		: '';

	if ( 'completed' !== $verified_status ) {
		return new WP_Error(
			'd360_bridge_enrollment_not_completed',
			'Tutor LMS no confirmo el estado de la matricula directa (posiblemente requiere una orden de compra, p. ej. cursos dentro de un bundle).',
			array( 'status' => 409 )
		);
	}

	return array(
		'enrollment_id'      => $enrollment_id,
		'already_completed'  => false,
		'created_enrollment' => true,
	);
}

function d360_bridge_create_direct_enrollment( $student_id, $course_id ) {
	if ( ! function_exists( 'tutor_utils' ) ) {
		return new WP_Error(
			'd360_bridge_tutor_utils_missing',
			'Tutor LMS no expuso tutor_utils() para crear la matricula directamente.',
			array( 'status' => 500 )
		);
	}

	$tutor_utils = tutor_utils();
	if ( ! is_object( $tutor_utils ) || ! method_exists( $tutor_utils, 'do_enroll' ) ) {
		return new WP_Error(
			'd360_bridge_do_enroll_missing',
			'Tutor LMS no expuso do_enroll() para crear la matricula directamente.',
			array( 'status' => 500 )
		);
	}

	$result = $tutor_utils->do_enroll( $course_id, 0, $student_id );
	if ( false === $result ) {
		return new WP_Error(
			'd360_bridge_do_enroll_failed',
			'Tutor LMS rechazo la matricula directa del alumno.',
			array( 'status' => 500 )
		);
	}

	update_user_meta( $student_id, '_is_tutor_student', time() );

	return true;
}

function d360_bridge_find_enrollment_post_id( $student_id, $course_id ) {
	$matches = get_posts(
		array(
			'post_type'        => 'tutor_enrolled',
			'post_status'      => 'any',
			'author'           => absint( $student_id ),
			'post_parent'      => absint( $course_id ),
			'numberposts'      => 1,
			'orderby'          => 'ID',
			'order'            => 'DESC',
			'fields'           => 'ids',
			'suppress_filters' => false,
		)
	);

	if ( empty( $matches ) ) {
		return 0;
	}

	return (int) $matches[0];
}

function d360_bridge_get_direct_student_courses( $student_id ) {
	$student_id = absint( $student_id );
	if ( ! $student_id ) {
		return array();
	}

	$enrollment_ids = d360_bridge_get_student_enrollment_ids( $student_id );

	if ( empty( $enrollment_ids ) ) {
		return array();
	}

	$courses = array();
	$seen    = array();

	foreach ( $enrollment_ids as $enrollment_id ) {
		$enrollment = get_post( $enrollment_id );
		if ( ! $enrollment instanceof WP_Post ) {
			continue;
		}

		$course_id = absint( $enrollment->post_parent );
		if ( ! $course_id || isset( $seen[ $course_id ] ) ) {
			continue;
		}

		$course = get_post( $course_id );
		if ( ! $course instanceof WP_Post ) {
			continue;
		}

		$seen[ $course_id ] = true;
		$started_at = d360_bridge_mysql_gmt_to_iso( $enrollment->post_date_gmt );

		$courses[] = array(
			'wp_course_id'    => $course_id,
			'title'           => wp_strip_all_tags( get_the_title( $course_id ) ),
			'progress_pct'    => 0,
			'completed'       => false,
			'started_at'      => $started_at,
			'completed_at'    => null,
			'certificate_url' => null,
			'raw'             => array(
				'source'            => 'direct_enrollment_fallback',
				'enrollment_id'     => (int) $enrollment_id,
				'enrollment_status' => $enrollment->post_status,
				'course_url'        => get_permalink( $course_id ),
			),
		);
	}

	return $courses;
}

function d360_bridge_get_cached_course_certificate_url( $student_id, $course_id ) {
	$cache_key = sprintf( 'd360_certificate_url_%d', absint( $course_id ) );
	$cached    = get_user_meta( $student_id, $cache_key, true );

	if ( is_string( $cached ) && '' !== trim( $cached ) ) {
		return trim( $cached );
	}

	$resolved = d360_bridge_resolve_course_certificate_url( $student_id, $course_id );
	if ( $resolved ) {
		update_user_meta( $student_id, $cache_key, esc_url_raw( $resolved ) );
	}

	return $resolved;
}

function d360_bridge_get_course_quiz_attempts( $student_id, $course_id ) {
	global $wpdb;

	$student_id = absint( $student_id );
	$course_id  = absint( $course_id );

	if ( ! $student_id || ! $course_id ) {
		return array();
	}

	$table = $wpdb->prefix . 'tutor_quiz_attempts';

	$rows = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT attempt_id, quiz_id, total_questions, total_answered_questions, total_marks, earned_marks, attempt_status, attempt_started_at, attempt_ended_at, result
			 FROM {$table}
			 WHERE user_id = %d AND course_id = %d
			 ORDER BY attempt_started_at DESC",
			$student_id,
			$course_id
		),
		ARRAY_A
	);

	if ( empty( $rows ) ) {
		return array();
	}

	$attempts = array();

	foreach ( $rows as $row ) {
		$quiz_title = get_the_title( (int) $row['quiz_id'] );

		$attempts[] = array(
			'attempt_id'               => (int) $row['attempt_id'],
			'quiz_id'                  => (int) $row['quiz_id'],
			'quiz_name'                => $quiz_title ? wp_strip_all_tags( $quiz_title ) : null,
			'total_questions'          => isset( $row['total_questions'] ) ? (int) $row['total_questions'] : 0,
			'total_answered_questions' => isset( $row['total_answered_questions'] ) ? (int) $row['total_answered_questions'] : 0,
			'total_marks'              => isset( $row['total_marks'] ) ? (float) $row['total_marks'] : 0,
			'earned_marks'             => isset( $row['earned_marks'] ) ? (float) $row['earned_marks'] : 0,
			'attempt_status'           => isset( $row['attempt_status'] ) ? $row['attempt_status'] : null,
			'attempt_started_at'       => isset( $row['attempt_started_at'] ) ? d360_bridge_normalize_datetime_to_iso( $row['attempt_started_at'] ) : null,
			'attempt_ended_at'         => isset( $row['attempt_ended_at'] ) ? d360_bridge_normalize_datetime_to_iso( $row['attempt_ended_at'] ) : null,
			'result'                   => isset( $row['result'] ) ? $row['result'] : null,
		);
	}

	return $attempts;
}

function d360_bridge_get_tutor_time_offset_seconds() {
	$gmt_offset_hours = (float) get_option( 'gmt_offset', 0 );

	return (int) round( $gmt_offset_hours * HOUR_IN_SECONDS );
}

function d360_bridge_tutor_time_to_iso( $value ) {
	if ( ! is_numeric( $value ) ) {
		return null;
	}

	$timestamp = (int) $value;
	if ( $timestamp <= 0 ) {
		return null;
	}

	$utc_timestamp = $timestamp - d360_bridge_get_tutor_time_offset_seconds();

	return gmdate( 'c', $utc_timestamp );
}

function d360_bridge_get_course_lesson_completions( $student_id, $course_id ) {
	global $wpdb;

	$student_id = absint( $student_id );
	$course_id  = absint( $course_id );

	if ( ! $student_id || ! $course_id ) {
		return array();
	}

	$lessons = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT content.ID, content.post_title
			 FROM {$wpdb->posts} course
			 INNER JOIN {$wpdb->posts} topic ON course.ID = topic.post_parent
			 INNER JOIN {$wpdb->posts} content ON topic.ID = content.post_parent
			 WHERE course.ID = %d AND content.post_type = 'lesson'",
			$course_id
		),
		ARRAY_A
	);

	if ( empty( $lessons ) ) {
		return array();
	}

	$completions = array();

	foreach ( $lessons as $lesson ) {
		$lesson_id = (int) $lesson['ID'];

		$raw_completed_at = get_user_meta( $student_id, '_tutor_completed_lesson_id_' . $lesson_id, true );
		if ( '' === $raw_completed_at || false === $raw_completed_at ) {
			continue;
		}

		$completed_at = d360_bridge_tutor_time_to_iso( $raw_completed_at );
		if ( ! $completed_at ) {
			continue;
		}

		$completions[] = array(
			'wp_lesson_id' => $lesson_id,
			'title'        => wp_strip_all_tags( (string) $lesson['post_title'] ),
			'completed_at' => $completed_at,
		);
	}

	return $completions;
}

function d360_bridge_enrich_student_courses_for_sync( $student_id, $courses ) {
	if ( ! is_array( $courses ) ) {
		return array();
	}

	$enriched_courses = array();

	foreach ( $courses as $course ) {
		if ( ! is_array( $course ) ) {
			continue;
		}

		$course_id = isset( $course['wp_course_id'] ) ? absint( $course['wp_course_id'] ) : 0;
		if ( ! $course_id ) {
			continue;
		}

		$progress_stats = d360_bridge_get_course_progress_stats( $student_id, $course_id );
		if ( ! empty( $progress_stats ) ) {
			$course['progress_pct'] = isset( $progress_stats['progress_pct'] ) ? (int) $progress_stats['progress_pct'] : ( isset( $course['progress_pct'] ) ? (int) $course['progress_pct'] : 0 );
			$course['completed']    = ! empty( $progress_stats['completed'] );

			if ( empty( $course['started_at'] ) && ! empty( $progress_stats['started_at'] ) ) {
				$course['started_at'] = $progress_stats['started_at'];
			}

			if ( ! empty( $progress_stats['completed_at'] ) ) {
				$course['completed_at'] = $progress_stats['completed_at'];
			}
		}

		if ( empty( $course['certificate_url'] ) && ! empty( $course['completed'] ) ) {
			$course['certificate_url'] = d360_bridge_get_cached_course_certificate_url( $student_id, $course_id );
		}

		$enriched_courses[] = array(
			'wp_course_id'       => $course_id,
			'title'              => isset( $course['title'] ) ? wp_strip_all_tags( (string) $course['title'] ) : '',
			'progress_pct'       => isset( $course['progress_pct'] ) ? max( 0, min( 100, (int) $course['progress_pct'] ) ) : 0,
			'completed'          => ! empty( $course['completed'] ),
			'started_at'         => isset( $course['started_at'] ) ? $course['started_at'] : null,
			'completed_at'       => isset( $course['completed_at'] ) ? $course['completed_at'] : null,
			'certificate_url'    => isset( $course['certificate_url'] ) ? $course['certificate_url'] : null,
			'quiz_attempts'      => d360_bridge_get_course_quiz_attempts( $student_id, $course_id ),
			'lesson_completions' => d360_bridge_get_course_lesson_completions( $student_id, $course_id ),
		);
	}

	return $enriched_courses;
}

function d360_bridge_build_student_learning_snapshot( $student_id ) {
	$student_id = absint( $student_id );
	if ( ! $student_id ) {
		return array();
	}

	$courses = d360_bridge_enrich_student_courses_for_sync(
		$student_id,
		d360_bridge_get_direct_student_courses( $student_id )
	);

	$certificates = array();

	foreach ( $courses as $course ) {
		if ( empty( $course['completed'] ) || empty( $course['certificate_url'] ) ) {
			continue;
		}

		$certificates[] = array(
			'wp_course_id'    => isset( $course['wp_course_id'] ) ? (int) $course['wp_course_id'] : 0,
			'title'           => isset( $course['title'] ) ? $course['title'] : '',
			'certificate_url' => isset( $course['certificate_url'] ) ? $course['certificate_url'] : null,
			'completed_at'    => isset( $course['completed_at'] ) ? $course['completed_at'] : null,
		);
	}

	return array(
		'courses'      => $courses,
		'certificates' => $certificates,
	);
}

function d360_bridge_get_tracked_student_ids( $after_user_id, $limit ) {
	global $wpdb;

	$after_user_id = absint( $after_user_id );
	$limit         = max( 1, min( 50, absint( $limit ) ) );

	$query = $wpdb->prepare(
		"SELECT DISTINCT u.ID
		FROM {$wpdb->users} u
		INNER JOIN {$wpdb->usermeta} um ON um.user_id = u.ID AND um.meta_key = %s
		WHERE u.ID > %d
		ORDER BY u.ID ASC
		LIMIT %d",
		'd360_employee_id',
		$after_user_id,
		$limit
	);

	$results = $wpdb->get_col( $query );
	return array_map( 'absint', is_array( $results ) ? $results : array() );
}

function d360_bridge_send_learning_webhook_batch( $events, $event_type, $occurred_at ) {
	$webhook_url    = d360_bridge_get_portal_webhook_url();
	$webhook_secret = d360_bridge_get_portal_webhook_secret();

	if ( '' === $webhook_url || '' === $webhook_secret ) {
		return new WP_Error(
			'd360_bridge_webhook_not_configured',
			'No se ha configurado el webhook del portal.',
			array( 'status' => 500 )
		);
	}

	$payload = array(
		'event_type'  => $event_type,
		'occurred_at' => $occurred_at,
		'events'      => $events,
	);

	$timestamp = (string) time();
	$body      = wp_json_encode( $payload );
	$signature = hash_hmac( 'sha256', $timestamp . '.' . $body, $webhook_secret );

	$response = wp_remote_post(
		$webhook_url,
		array(
			'timeout' => 75,
			'headers' => array(
				'Content-Type'             => 'application/json',
				'Accept'                   => 'application/json',
				'X-D360-Webhook-Timestamp' => $timestamp,
				'X-D360-Webhook-Signature' => $signature,
				'X-D360-Webhook-Event'     => $event_type,
			),
			'body'    => $body,
		)
	);

	if ( is_wp_error( $response ) ) {
		return $response;
	}

	$status_code = wp_remote_retrieve_response_code( $response );
	if ( $status_code < 200 || $status_code >= 300 ) {
		return new WP_Error(
			'd360_bridge_webhook_http_error',
			sprintf( 'El portal respondio con status %d al webhook academico por lote.', (int) $status_code ),
			array(
				'status' => $status_code,
				'body'   => wp_remote_retrieve_body( $response ),
			)
		);
	}

	$decoded = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( ! is_array( $decoded ) || ! isset( $decoded['results'] ) || ! is_array( $decoded['results'] ) ) {
		return new WP_Error(
			'd360_bridge_webhook_bad_response',
			'El portal respondio sin la lista de resultados esperada para el lote.',
			array( 'status' => 502 )
		);
	}

	return $decoded['results'];
}

function d360_bridge_process_learning_webhook_tick() {
	if ( ! d360_bridge_is_learning_webhook_configured() ) {
		return;
	}

	$batch_size = d360_bridge_get_webhook_batch_size();
	$cursor     = absint( get_option( D360_BRIDGE_WEBHOOK_CURSOR_OPTION, 0 ) );
	$user_ids   = d360_bridge_get_tracked_student_ids( $cursor, $batch_size );

	if ( empty( $user_ids ) ) {
		if ( 0 !== $cursor ) {
			update_option( D360_BRIDGE_WEBHOOK_CURSOR_OPTION, 0, false );
		}
		return;
	}

	$events        = array();
	$source_hashes = array();

	foreach ( $user_ids as $user_id ) {
		$employee_id = (string) get_user_meta( $user_id, 'd360_employee_id', true );
		$company_id  = (string) get_user_meta( $user_id, 'd360_company_id', true );
		$snapshot    = d360_bridge_build_student_learning_snapshot( $user_id );

		update_option( D360_BRIDGE_WEBHOOK_CURSOR_OPTION, $user_id, false );

		if ( empty( $snapshot['courses'] ) && empty( $snapshot['certificates'] ) ) {
			continue;
		}

		$hash_payload = array(
			'courses'      => isset( $snapshot['courses'] ) ? $snapshot['courses'] : array(),
			'certificates' => isset( $snapshot['certificates'] ) ? $snapshot['certificates'] : array(),
		);
		$source_hash = hash( 'sha256', wp_json_encode( $hash_payload ) );
		$last_hash   = (string) get_user_meta( $user_id, 'd360_learning_snapshot_hash', true );

		if ( $source_hash === $last_hash ) {
			continue;
		}

		$events[] = array(
			'student_wp_user_id' => $user_id,
			'employee_id'        => $employee_id ? $employee_id : null,
			'company_id'         => $company_id ? $company_id : null,
			'source_hash'        => $source_hash,
			'courses'            => $snapshot['courses'],
			'certificates'       => $snapshot['certificates'],
		);
		$source_hashes[ $user_id ] = $source_hash;
	}

	if ( empty( $events ) ) {
		return;
	}

	$results = d360_bridge_send_learning_webhook_batch( $events, 'student_learning_changed', gmdate( 'c' ) );

	if ( is_wp_error( $results ) ) {
		error_log(
			sprintf(
				'[Desarrolla360 Bridge] Learning webhook batch failed for %d student(s): %s',
				count( $events ),
				$results->get_error_message()
			)
		);
		return;
	}

	foreach ( $results as $result ) {
		if ( empty( $result['student_wp_user_id'] ) ) {
			continue;
		}

		$user_id = absint( $result['student_wp_user_id'] );

		if ( empty( $result['ok'] ) ) {
			error_log(
				sprintf(
					'[Desarrolla360 Bridge] Learning webhook failed for user %d: %s',
					$user_id,
					isset( $result['message'] ) ? $result['message'] : 'Unknown webhook error'
				)
			);
			continue;
		}

		if ( isset( $source_hashes[ $user_id ] ) ) {
			update_user_meta( $user_id, 'd360_learning_snapshot_hash', $source_hashes[ $user_id ] );
			update_user_meta( $user_id, 'd360_learning_snapshot_sent_at', gmdate( 'c' ) );
		}
	}
}

function d360_bridge_dispatch_tutor_request( $method, $route, $params = array() ) {
	$service_user_id = d360_bridge_get_service_user_id();

	if ( ! $service_user_id ) {
		return new WP_Error(
			'd360_bridge_missing_service_user',
			'Configura un Service User ID para despachar llamadas a Tutor LMS.',
			array( 'status' => 500 )
		);
	}

	$service_user = get_user_by( 'id', $service_user_id );
	if ( ! $service_user instanceof WP_User ) {
		return new WP_Error(
			'd360_bridge_invalid_service_user',
			'El Service User ID configurado no existe en WordPress.',
			array( 'status' => 500 )
		);
	}

	wp_set_current_user( $service_user_id );

	$request = new WP_REST_Request( strtoupper( $method ), $route );

	if ( in_array( strtoupper( $method ), array( 'POST', 'PUT', 'PATCH' ), true ) ) {
		$request->set_body_params( $params );
	} else {
		foreach ( $params as $key => $value ) {
			$request->set_param( $key, $value );
		}
	}

	$response = rest_do_request( $request );

	if ( is_wp_error( $response ) ) {
		return $response;
	}

	$status = $response->get_status();
	$data   = $response->get_data();

	if ( $status >= 400 ) {
		$message = is_array( $data ) && isset( $data['message'] ) ? $data['message'] : 'Tutor LMS devolvio un error.';
		return new WP_Error(
			'd360_bridge_tutor_error',
			$message,
			array(
				'status' => $status,
				'data'   => $data,
			)
		);
	}

	return $data;
}

function d360_bridge_is_permission_error( $error ) {
	if ( ! is_wp_error( $error ) ) {
		return false;
	}

	$message = strtolower( $error->get_error_message() );
	$status  = (int) $error->get_error_data( 'status' );

	return false !== strpos( $message, 'permiso' ) || false !== strpos( $message, 'permission' ) || 401 === $status || 403 === $status;
}

function d360_bridge_dispatch_tutor_http_request( $method, $route, $params = array() ) {
	$api_key    = d360_bridge_get_tutor_api_key();
	$api_secret = d360_bridge_get_tutor_api_secret();

	if ( '' === $api_key || '' === $api_secret ) {
		return new WP_Error(
			'd360_bridge_missing_tutor_api_credentials',
			'Configura Tutor API Key y Tutor API Secret en Desarrolla360 Bridge para usar el respaldo HTTP.',
			array( 'status' => 500 )
		);
	}

	$url = home_url( '/wp-json' . $route );
	$method = strtoupper( $method );

	$args = array(
		'method'  => $method,
		'timeout' => 20,
		'headers' => array(
			'Accept'        => 'application/json',
			'Content-Type'  => 'application/json',
			'Authorization' => 'Basic ' . base64_encode( $api_key . ':' . $api_secret ),
		),
	);

	if ( in_array( $method, array( 'GET', 'DELETE' ), true ) ) {
		if ( ! empty( $params ) ) {
			$url = add_query_arg( $params, $url );
		}
	} else {
		$args['body'] = wp_json_encode( $params );
	}

	$response = wp_remote_request( $url, $args );

	if ( is_wp_error( $response ) ) {
		return $response;
	}

	$status = (int) wp_remote_retrieve_response_code( $response );
	$body   = wp_remote_retrieve_body( $response );
	$data   = json_decode( $body, true );

	if ( $status >= 400 ) {
		$message = is_array( $data ) && isset( $data['message'] ) ? $data['message'] : 'Tutor LMS devolvio un error.';
		return new WP_Error(
			'd360_bridge_tutor_http_error',
			$message,
			array(
				'status' => $status,
				'data'   => $data,
			)
		);
	}

	return is_array( $data ) ? $data : array();
}

function d360_bridge_normalize_courses( $payload ) {
	$items = array();

	if ( isset( $payload['courses'] ) && is_array( $payload['courses'] ) ) {
		$items = $payload['courses'];
	} elseif ( isset( $payload['data'] ) && is_array( $payload['data'] ) ) {
		$items = $payload['data'];
	} elseif ( is_array( $payload ) ) {
		$items = $payload;
	}

	$normalized = array();

	foreach ( $items as $item ) {
		if ( ! is_array( $item ) ) {
			continue;
		}

		$progress = d360_bridge_extract_progress( $item );
		$completed = d360_bridge_extract_completed( $item, $progress );

		$normalized[] = array(
			'wp_course_id'    => d360_bridge_extract_course_id( $item ),
			'title'           => d360_bridge_extract_title( $item ),
			'progress_pct'    => $progress,
			'completed'       => $completed,
			'started_at'      => d360_bridge_extract_first_value( $item, array( 'started_at', 'date_started', 'start_date' ) ),
			'completed_at'    => d360_bridge_extract_first_value( $item, array( 'completed_at', 'date_completed', 'completion_date' ) ),
			'certificate_url' => d360_bridge_extract_first_value( $item, array( 'certificate_url', 'certificate_link', 'credential_url', 'view_certificate_url' ) ),
			'raw'             => $item,
		);
	}

	return $normalized;
}

function d360_bridge_normalize_enrollments( $payload ) {
	$items = array();

	if ( isset( $payload['enrollments'] ) && is_array( $payload['enrollments'] ) ) {
		$items = $payload['enrollments'];
	} elseif ( isset( $payload['data'] ) && is_array( $payload['data'] ) ) {
		$items = $payload['data'];
	} elseif ( is_array( $payload ) ) {
		$items = $payload;
	}

	$normalized = array();

	foreach ( $items as $item ) {
		if ( ! is_array( $item ) ) {
			continue;
		}

		$enrollment_id = d360_bridge_extract_first_value( $item, array( 'enrollment_id', 'id', 'ID', 'order_id' ) );
		$enrollment_id = absint( $enrollment_id );

		if ( ! $enrollment_id ) {
			continue;
		}

		$normalized[] = array(
			'enrollment_id' => $enrollment_id,
			'user_id'       => absint( d360_bridge_extract_first_value( $item, array( 'user_id', 'student_id', 'author_id' ) ) ),
			'course_id'     => absint( d360_bridge_extract_first_value( $item, array( 'course_id', 'post_id' ) ) ),
			'status'        => d360_bridge_extract_first_value( $item, array( 'status', 'post_status', 'enrollment_status' ) ),
			'raw'           => $item,
		);
	}

	return $normalized;
}

function d360_bridge_find_student_enrollment( $student_id, $course_id, $payload ) {
	foreach ( d360_bridge_normalize_enrollments( $payload ) as $enrollment ) {
		if ( (int) $student_id !== (int) $enrollment['user_id'] ) {
			continue;
		}

		if ( $course_id && (int) $course_id !== (int) $enrollment['course_id'] ) {
			continue;
		}

		return $enrollment;
	}

	return null;
}


function d360_bridge_extract_course_id( $item ) {
	$value = d360_bridge_extract_first_value( $item, array( 'course_id', 'ID', 'id' ) );
	return absint( $value );
}

function d360_bridge_extract_title( $item ) {
	$value = d360_bridge_extract_first_value( $item, array( 'post_title', 'title', 'course_title', 'name' ) );

	if ( is_array( $value ) && isset( $value['rendered'] ) ) {
		return wp_strip_all_tags( (string) $value['rendered'] );
	}

	return wp_strip_all_tags( (string) $value );
}

function d360_bridge_extract_progress( $item ) {
	$value = d360_bridge_extract_first_value(
		$item,
		array(
			'course_completed_percent',
			'completed_percent',
			'progress_pct',
			'progress',
			'percentage',
		)
	);

	if ( is_string( $value ) ) {
		$value = str_replace( '%', '', $value );
	}

	return max( 0, min( 100, (int) round( floatval( $value ) ) ) );
}

function d360_bridge_extract_completed( $item, $progress ) {
	$status = d360_bridge_extract_first_value( $item, array( 'status', 'course_status', 'enrollment_status' ) );
	$status = is_string( $status ) ? strtolower( $status ) : '';

	if ( in_array( $status, array( 'completed', 'complete', 'passed' ), true ) ) {
		return true;
	}

	return $progress >= 100;
}

function d360_bridge_extract_first_value( $item, $keys ) {
	foreach ( $keys as $key ) {
		if ( isset( $item[ $key ] ) ) {
			return $item[ $key ];
		}
	}

	return null;
}
