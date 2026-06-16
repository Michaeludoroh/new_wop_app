# Runbook: WebSocket Outage

## Trigger Signals

- `WebSocketUnavailable` alert firing
- Connection/auth failure spikes
- Reconnect storm (`websocket_reconnects_total` surge)

## Impact

- Realtime updates unavailable or delayed
- Presence/room events not delivered
- User experience degraded in live features

## Immediate Actions

1. Acknowledge incident and page realtime owner.
2. Confirm whether outage is gateway-only or dependency-driven.
3. Validate Redis adapter and API auth dependencies.
4. Check deploy/change events near incident start.

## Diagnostics

- WebSocket service logs
- Connection count vs disconnect/reconnect rates
- Auth failure metrics and token validation path
- Redis pub/sub health and latency

## Mitigation

- Restart WebSocket instances if process fault observed.
- Drain and rebalance connections if node hot-spots exist.
- Temporarily reduce non-essential realtime channels.
- Roll back recent websocket/auth integration changes.

## Recovery Validation

- `up{job="ministry_websocket"} == 1`
- Reconnect/auth failure rates normalize
- Active connections stabilize and message flow resumes

## Communication

- Status page update for realtime impact
- Publish ETA and known workarounds if available

## Post-Incident

- Root cause and failure mode classification
- Add safeguards for reconnect storms and auth path regression
