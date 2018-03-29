#!/bin/sh

#BACKUP_DIR=20180329

su postgres -c "psql -c \"CREATE DATABASE \"$DB_NAME\"\""
su postgres -c "psql -c \"CREATE USER $DB_USER WITH LOGIN PASSWORD '$DB_PASS'\""
export PGPASSWORD=$DB_PASS
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d "$DB_NAME" < data/$BACKUP_DIR/ajab-gajab.dump
//psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d "$DB_NAME" -f data/final_toy_script.sql
