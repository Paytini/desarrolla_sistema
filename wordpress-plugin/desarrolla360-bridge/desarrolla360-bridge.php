<?php
/**
 * Plugin Name: Desarrolla360 Bridge
 * Description: REST bridge between the Desarrolla360 portal and WordPress/Tutor LMS.
 * Version: 0.1.10
 * Author: Desarrolla360
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'D360_BRIDGE_VERSION', '0.1.10' );
define( 'D360_BRIDGE_OPTION_KEY', 'd360_bridge_settings' );

add_action( 'admin_menu', 'd360_bridge_register_settings_page' );
add_action( 'admin_init', 'd360_bridge_register_settings' );
add_action( 'rest_api_init', 'd360_bridge_register_rest_routes' );
add_action( 'init', 'd360_bridge_handle_portal_autologin', 1 );

function d360_bridge_default_settings() {
	return array(
		'portal_key'        => '',
		'service_user_id'   => 0,
		'tutor_api_key'     => '',
		'tutor_api_secret'  => '',
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
		update_user_meta( $user->ID, 'd360_employee_id', absint( $params['employee_id'] ) );
	}

	if ( isset( $params['company']['id'] ) ) {
		update_user_meta( $user->ID, 'd360_company_id', absint( $params['company']['id'] ) );
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

	$employee_id = isset( $params['employee_id'] ) ? absint( $params['employee_id'] ) : 0;
	if ( ! $employee_id ) {
		return null;
	}

	$users = get_users(
		array(
			'number'     => 1,
			'count_total' => false,
			'meta_key'   => 'd360_employee_id',
			'meta_value' => $employee_id,
		)
	);

	if ( empty( $users ) || ! $users[0] instanceof WP_User ) {
		return null;
	}

	return $users[0];
}

function d360_bridge_delete_student_enrollments( $student_id ) {
	$student_id = absint( $student_id );
	if ( ! $student_id ) {
		return 0;
	}

	$enrollment_ids = get_posts(
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
		$all_courses[] = array(
			'wp_course_id' => (int) $course_id,
			'title'        => get_the_title( $course_id ),
			'status'       => get_post_status( $course_id ),
			'post_type'    => $post_type,
			'course_url'   => get_permalink( $course_id ),
		);
	}

	return rest_ensure_response(
		array(
			'courses' => $all_courses,
			'total'   => count( $all_courses ),
		)
	);
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

		$direct_access = d360_bridge_sync_direct_course_access( $user_id, $course_id );
		if ( ! is_wp_error( $direct_access ) ) {
			$enrolled[] = $course_id;
			continue;
		}

		$response = d360_bridge_dispatch_tutor_request(
			'POST',
			'/tutor/v1/enrollments',
			array(
				'user_id'   => $user_id,
				'course_id' => $course_id,
			)
		);

		if ( is_wp_error( $response ) ) {
			$failed[] = array(
				'course_id' => $course_id,
				'message'   => $response->get_error_message(),
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

function d360_bridge_student_courses( WP_REST_Request $request ) {
	$student_id = absint( $request['student_id'] );

	$response = d360_bridge_dispatch_tutor_request(
		'GET',
		sprintf( '/tutor/v1/students/%d/courses', $student_id )
	);

	if ( is_wp_error( $response ) ) {
		$direct_courses = d360_bridge_get_direct_student_courses( $student_id );
		if ( ! empty( $direct_courses ) ) {
			$direct_courses = d360_bridge_enrich_student_courses( $student_id, $direct_courses );

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

	$normalized_courses = d360_bridge_enrich_student_courses( $student_id, $normalized_courses );

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
			'courses' => d360_bridge_enrich_student_courses( $student_id, $direct_courses ),
		);
	}

	$certificates = array();

	foreach ( d360_bridge_enrich_student_courses( $student_id, d360_bridge_normalize_courses( $response ) ) as $course ) {
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

		$direct_access = d360_bridge_sync_direct_course_access( $student_id, $course_id );
		if ( ! is_wp_error( $direct_access ) ) {
			if ( ! empty( $direct_access['already_completed'] ) ) {
				$already_ok[] = $course_id;
			} else {
				$completed[] = $course_id;
			}
			continue;
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
			$failed[] = array(
				'course_id' => $course_id,
				'message'   => $enrollments_response->get_error_message(),
			);
			continue;
		}

		$matched_enrollment = d360_bridge_find_student_enrollment( $student_id, $course_id, $enrollments_response );

		if ( empty( $matched_enrollment ) || empty( $matched_enrollment['enrollment_id'] ) ) {
			$failed[] = array(
				'course_id' => $course_id,
				'message'   => 'Tutor LMS no devolvio una matricula utilizable para este alumno.',
			);
			continue;
		}

		$status = isset( $matched_enrollment['status'] ) ? strtolower( (string) $matched_enrollment['status'] ) : '';
		if ( 'completed' === $status ) {
			$already_ok[] = $course_id;
			continue;
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
			$failed[] = array(
				'course_id' => $course_id,
				'message'   => $complete_response->get_error_message(),
			);
			continue;
		}

		$completed[] = $course_id;
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

function d360_bridge_enrich_student_courses( $student_id, $courses ) {
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
			$enriched_courses[] = $course;
			continue;
		}

		$progress_stats = d360_bridge_get_course_progress_stats( $student_id, $course_id );

		if ( ! empty( $progress_stats ) ) {
			$course['progress_pct'] = $progress_stats['progress_pct'];
			$course['completed']    = $progress_stats['completed'];

			if ( empty( $course['started_at'] ) && ! empty( $progress_stats['started_at'] ) ) {
				$course['started_at'] = $progress_stats['started_at'];
			}

			if ( ! empty( $progress_stats['completed_at'] ) ) {
				$course['completed_at'] = $progress_stats['completed_at'];
			}

			if ( ! isset( $course['raw'] ) || ! is_array( $course['raw'] ) ) {
				$course['raw'] = array();
			}

			$course['raw']['d360_progress'] = $progress_stats;
		}

		if ( empty( $course['certificate_url'] ) && ! empty( $course['completed'] ) ) {
			$course['certificate_url'] = d360_bridge_resolve_course_certificate_url( $student_id, $course_id );
		}

		if ( ! isset( $course['raw'] ) || ! is_array( $course['raw'] ) ) {
			$course['raw'] = array();
		}

		$course['raw']['d360_certificate'] = d360_bridge_get_course_certificate_debug_data( $student_id, $course_id );

		$enriched_courses[] = $course;
	}

	return $enriched_courses;
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
			$started_at = $enrollment->post_date_gmt ? mysql2date( 'c', $enrollment->post_date_gmt, false ) : null;

			if ( $progress_pct >= 100 ) {
				$completed_at = $enrollment->post_modified_gmt
					? mysql2date( 'c', $enrollment->post_modified_gmt, false )
					: $started_at;
			}
		}
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

	$enrollment_ids = get_posts(
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
		$started_at = $enrollment->post_date_gmt ? mysql2date( 'c', $enrollment->post_date_gmt, false ) : null;

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
