#!/bin/sh

set -e

ENV_FILE="/app/.env"

# Cargar variables del .env si existe
if [ -f "$ENV_FILE" ]; then
  echo "Cargando variables desde $ENV_FILE"
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

echo " Esperando a que MySQL esté completamente inicializado..."

# Bucle con impresión real en consola
while true; do
  echo "Ejecutando consulta MySQL:"

  # Ejecutar y ver directamente sin redirigir a variable
  mysql -h mysql -u"${API_DB_USER}" -p"${API_DB_PASSWORD}" "${MYSQL_DATABASE}" -e "SELECT * FROM users LIMIT 1;"
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    echo "Consulta exitosa. Continuamos..."
    break
  else
    echo "Error ($EXIT_CODE): Consulta fallida. Reintentando en 5s..."
    sleep 5
  fi
done

echo "Lanzando la API..."
exec "$@"
