-- Renames the Role enum's Spanish values to English, preserving all existing
-- rows: RENAME VALUE relabels the enum member in place, it does not change
-- which rows use it.
ALTER TYPE "Role" RENAME VALUE 'RH' TO 'HR';
ALTER TYPE "Role" RENAME VALUE 'EMPLEADO' TO 'EMPLOYEE';
