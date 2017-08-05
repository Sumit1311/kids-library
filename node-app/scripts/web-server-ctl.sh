#!/bin/bash

EXECUTABLE='node'
SCRIPT='app.js'
USER=`whoami`
APP_DIR='/home/geek/workspace/navnirmitee/node-app'

PIDFILE=$APP_DIR/navnirmitee.pid
LOGFILE=$APP_DIR/navnirmitee.log

touch $PIDFILE
touch $LOGFILE

start() {
    echo $(cat "$PIDFILE");
    if [ -f "$PIDFILE" ] && kill -0 $(cat "$PIDFILE"); then
        echo 'Service already running' >&2
        return 1
    fi
    echo 'Starting service…' >&2
    #local CMD="$EXECUTABLE $SCRIPT > \"$LOGFILE\" 2>&1 & echo \$!"
    local CMD="$EXECUTABLE $SCRIPT > \"$LOGFILE\" 2>&1"
    echo $CMD
    #su -c "$CMD" $USER > "$PIDFILE"
    $CMD &
    echo $! > "$PIDFILE"
    echo "disown"
    disown
    echo 'Service started' >&2
}

stop() {
    if [ ! -f "$PIDFILE" ] || ! kill -0 $(cat "$PIDFILE"); then
        echo 'Service not running' >&2
        return 1
    fi
    echo 'Stopping service…' >&2
    kill -15 $(cat "$PIDFILE") && rm -f "$PIDFILE"
    echo 'Service stopped' >&2
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        start
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|uninstall}"
esac
