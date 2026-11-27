# Mede, a cada segundo, o uso de CPU da API (100 = um núcleo inteiro) e as conexões do Postgres.
# Uso: source carga/monitor.sh; monitorar <nome>; ...; parar_monitor
monitorar() {
  local nome=$1 pid
  pid=$(cat api.pid)
  (
    prev=$(awk '{print $14+$15}' /proc/$pid/stat)
    while sleep 1; do
      cur=$(awk '{print $14+$15}' /proc/$pid/stat 2>/dev/null) || break
      echo "$((cur - prev)) $(awk '/VmRSS/{print int($2/1024) "MB"}' /proc/$pid/status)"
      prev=$cur
    done
  ) > carga/resultados/cpu-$nome.txt &
  MON_CPU=$!
  (
    echo "hora | ativas | esperando_trava | ociosas_em_transacao | total"
    while sleep 1; do
      psql -h 127.0.0.1 -U postgres -d boo -Atc "select to_char(now(),'HH24:MI:SS'), count(*) filter (where state='active'),
        count(*) filter (where wait_event_type='Lock'), count(*) filter (where state like 'idle in transaction%'), count(*)
        from pg_stat_activity where datname='boo' and pid <> pg_backend_pid()" 2>/dev/null
    done
  ) > carga/resultados/pg-$nome.txt &
  MON_PG=$!
}
parar_monitor() { kill $MON_CPU $MON_PG 2>/dev/null; wait $MON_CPU $MON_PG 2>/dev/null; true; }
