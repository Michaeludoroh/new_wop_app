import { RealtimeGateway } from './realtime.gateway';

function createSocket(token = 'token') {
  return {
    id: 'socket-1',
    handshake: {
      auth: { token, reconnect: true },
      headers: {},
    },
    data: {},
    join: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
}

describe('RealtimeGateway connection handling', () => {
  it('authenticates sockets and tracks reconnect attempts', async () => {
    const gateway = new RealtimeGateway(
      {
        verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', role: 'USER' }),
      } as never,
      {
        setWebsocketActiveConnections: jest.fn(),
        incrementWebsocketReconnects: jest.fn(),
        recordAuthFailure: jest.fn(),
        recordWebsocketFailure: jest.fn(),
        recordWebsocketDisconnect: jest.fn(),
      } as never,
    );
    const socket = createSocket();

    await gateway.handleConnection(socket as never);

    expect(socket.join).toHaveBeenCalledWith('user:user-1');
    expect(socket.join).toHaveBeenCalledWith('role:USER');
    expect(gateway.getHealthSummary()).toMatchObject({
      activeConnections: 1,
      authenticatedConnections: 1,
      reconnects: 1,
    });
  });

  it('rejects unauthenticated sockets', async () => {
    const gateway = new RealtimeGateway(
      {
        verifyAsync: jest.fn().mockRejectedValue(new Error('invalid token')),
      } as never,
      {
        setWebsocketActiveConnections: jest.fn(),
        incrementWebsocketReconnects: jest.fn(),
        recordAuthFailure: jest.fn(),
        recordWebsocketFailure: jest.fn(),
        recordWebsocketDisconnect: jest.fn(),
      } as never,
    );
    const socket = createSocket('bad-token');

    await gateway.handleConnection(socket as never);

    expect(socket.emit).toHaveBeenCalledWith(
      'realtime.error',
      expect.objectContaining({ code: 'REALTIME_UNAUTHORIZED' }),
    );
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });
});
