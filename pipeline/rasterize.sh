#!/bin/zsh
set -e
HERE=${0:A:h}
PUBLIC=$HERE/../site/public
OUT=$HERE/cache/brand
PORT=4339
cd $OUT
python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap "kill $SERVER" EXIT
sleep 1
playwright-cli -s=hullo-brand open >/dev/null
shot() {
  playwright-cli -s=hullo-brand resize $2 $3 >/dev/null
  playwright-cli -s=hullo-brand goto "http://127.0.0.1:$PORT/$1.html" >/dev/null
  sleep 1
  playwright-cli -s=hullo-brand screenshot --filename=$PUBLIC/$1.png >/dev/null
}
shot favicon-32 32 32
shot apple-touch-icon 180 180
shot og 1200 630
playwright-cli -s=hullo-brand close >/dev/null
