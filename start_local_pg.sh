#!/bin/bash
set -e

# Configuration
export LD_LIBRARY_PATH=/tmp/pg_bin/usr/lib/x86_64-linux-gnu
PG_BIN=/tmp/pg_bin/usr/lib/postgresql/15/bin
PG_DATA=/tmp/pg_data
PORT=5432
DB_USER="qrms_dev"
DB_PASS="b8fb5ee06e2f90831c6478b06ccd23fe420a5161fc10f002"
DB_NAME="qrms_development"

echo "=== Local User-Space PostgreSQL Bootstrap (Running as nobody) ==="

# 1. Create data directory and set permissions
echo "Setting up data directory..."
mkdir -p "$PG_DATA"
chown -R nobody:nogroup "$PG_DATA"

# Touch log file and set permissions
touch /tmp/pg_server.log
chown nobody:nogroup /tmp/pg_server.log

# 2. Initialize DB Cluster if not exists
if [ ! -f "$PG_DATA/PG_VERSION" ]; then
  echo "Initializing database cluster in $PG_DATA as user nobody..."
  su nobody -s /bin/bash -c "LD_LIBRARY_PATH=$LD_LIBRARY_PATH $PG_BIN/initdb -D $PG_DATA --auth-local=trust --auth-host=trust"
else
  echo "Database cluster already initialized."
fi

# 3. Start Postgres Server in background as user nobody
echo "Starting PostgreSQL server as user nobody on port $PORT..."
su nobody -s /bin/bash -c "LD_LIBRARY_PATH=$LD_LIBRARY_PATH $PG_BIN/postgres -D $PG_DATA -p $PORT -h 127.0.0.1 -k /tmp > /tmp/pg_server.log 2>&1 &"

# 4. Wait for database to start
echo "Waiting for PostgreSQL to be ready..."
for i in {1..20}; do
  if su nobody -s /bin/bash -c "LD_LIBRARY_PATH=$LD_LIBRARY_PATH $PG_BIN/pg_isready -h 127.0.0.1 -p $PORT" >/dev/null 2>&1; then
    echo "PostgreSQL is ready!"
    break
  fi
  sleep 1
  if [ $i -eq 20 ]; then
    echo "Error: PostgreSQL failed to start. Logs:"
    cat /tmp/pg_server.log
    exit 1
  fi
done

# 5. Check if qrms_dev user exists, create if not
echo "Creating user and database..."
USER_EXISTS=$(su nobody -s /bin/bash -c "LD_LIBRARY_PATH=$LD_LIBRARY_PATH $PG_BIN/psql -h 127.0.0.1 -p $PORT -d postgres -tAc \"SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'\"")
if [ "$USER_EXISTS" != "1" ]; then
  su nobody -s /bin/bash -c "LD_LIBRARY_PATH=$LD_LIBRARY_PATH $PG_BIN/psql -h 127.0.0.1 -p $PORT -d postgres -c \"CREATE USER $DB_USER WITH SUPERUSER PASSWORD '$DB_PASS';\""
  echo "User $DB_USER created."
else
  su nobody -s /bin/bash -c "LD_LIBRARY_PATH=$LD_LIBRARY_PATH $PG_BIN/psql -h 127.0.0.1 -p $PORT -d postgres -c \"ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';\""
  echo "User $DB_USER password updated."
fi

# 6. Check if qrms_development db exists, create if not
DB_EXISTS=$(su nobody -s /bin/bash -c "LD_LIBRARY_PATH=$LD_LIBRARY_PATH $PG_BIN/psql -h 127.0.0.1 -p $PORT -d postgres -tAc \"SELECT 1 FROM pg_database WHERE datname='$DB_NAME'\"")
if [ "$DB_EXISTS" != "1" ]; then
  su nobody -s /bin/bash -c "LD_LIBRARY_PATH=$LD_LIBRARY_PATH $PG_BIN/psql -h 127.0.0.1 -p $PORT -d postgres -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\""
  echo "Database $DB_NAME created."
else
  echo "Database $DB_NAME already exists."
fi

# 7. Apply schema from src/db/schema.sql
echo "Applying database schema from src/db/schema.sql..."
# We run as user nobody, but we connect as qrms_dev using its password
su nobody -s /bin/bash -c "LD_LIBRARY_PATH=$LD_LIBRARY_PATH PGPASSWORD=$DB_PASS $PG_BIN/psql -h 127.0.0.1 -p $PORT -U $DB_USER -d $DB_NAME -f ./src/db/schema.sql"

echo "=== PostgreSQL Bootstrap Completed Successfully! ==="
