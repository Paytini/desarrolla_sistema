# Metadata DC-3

El portal guarda una ficha DC-3 por curso para generar constancias con datos controlados.

## Firmas de instructores

Por ahora, las firmas PNG deben colocarse en:

```txt
public/assets/signatures/instructors/
```

Ejemplo:

```txt
public/assets/signatures/instructors/nanet-moreno.png
```

La URL que se captura en el portal debe ser:

```txt
/assets/signatures/instructors/nanet-moreno.png
```

Esta opción funciona bien mientras las firmas son pocas y forman parte del proyecto. Si después RH o Superadmin necesitan subir firmas desde el portal, conviene moverlas a Supabase Storage u otro almacenamiento de archivos.
