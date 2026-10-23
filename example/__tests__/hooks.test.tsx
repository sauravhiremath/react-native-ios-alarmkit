import React, { StrictMode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AlarmKitManager } from '../../src/AlarmKitManager';
import { AlarmKitError } from '../../src/types';
import { useAlarms, useAuthorizationState } from '../../src/hooks';

jest.mock('../../src/AlarmKitManager', () => ({
  AlarmKitManager: {
    shared: {
      isSupported: true,
      getAlarms: jest.fn(),
      getAuthorizationState: jest.fn(),
      addAlarmUpdatesListener: jest.fn(),
      addAuthorizationUpdatesListener: jest.fn(),
    },
  },
}));

function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const manager = AlarmKitManager.shared;
const cases = [
  { name: 'alarms', hook: useAlarms, read: manager.getAlarms, subscribe: manager.addAlarmUpdatesListener,
    key: 'alarms', initial: [{ id: 'initial' }], update: [{ id: 'newer' }] },
  { name: 'authorization', hook: useAuthorizationState, read: manager.getAuthorizationState,
    subscribe: manager.addAuthorizationUpdatesListener, key: 'state', initial: 'denied', update: 'authorized' },
] as const;

describe.each(cases)('$name hook', ({ hook, read, subscribe, key, initial, update }) => {
  let pending: ReturnType<typeof deferred>;
  let callback: (value: any) => void;
  let remove: jest.Mock;
  let latest: any;
  let renderer: ReactTestRenderer;
  const Probe = () => {
    latest = hook();
    return null;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    pending = deferred();
    Object.defineProperty(manager, 'isSupported', { configurable: true, value: true });
    (read as jest.Mock).mockReturnValue(pending.promise);
    remove = jest.fn();
    (subscribe as jest.Mock).mockImplementation((listener) => {
      callback = listener;
      return { remove };
    });
  });

  afterEach(async () => {
    if (renderer) await act(async () => renderer.unmount());
    jest.restoreAllMocks();
  });

  it('loads initial data, then accepts listener updates', async () => {
    await act(async () => { renderer = create(<Probe />); });
    expect(latest.isLoading).toBe(true);
    await act(async () => pending.resolve(initial));
    expect(latest[key]).toEqual(initial);
    await act(async () => callback(update));
    expect(latest[key]).toEqual(update);
    expect(latest.isLoading).toBe(false);
  });

  it('does not replace a listener update with a late initial read', async () => {
    await act(async () => { renderer = create(<Probe />); });
    await act(async () => callback(update));
    await act(async () => pending.resolve(initial));
    expect(latest[key]).toEqual(update);
  });

  it('does not replace a listener update with a late initial error', async () => {
    await act(async () => { renderer = create(<Probe />); });
    await act(async () => callback(update));
    await act(async () => pending.reject(new Error('late error')));
    expect(latest.error).toBeNull();
    expect(latest[key]).toEqual(update);
  });

  it('reports an initial error and clears it after an update', async () => {
    await act(async () => { renderer = create(<Probe />); });
    await act(async () => pending.reject(new Error('read failed')));
    expect(latest.error).toBeInstanceOf(AlarmKitError);
    expect(latest.isLoading).toBe(false);
    await act(async () => callback(update));
    expect(latest.error).toBeNull();
  });

  it('removes the listener and ignores late errors after unmount', async () => {
    const fromError = jest.spyOn(AlarmKitError, 'fromError');
    await act(async () => { renderer = create(<Probe />); });
    await act(async () => renderer.unmount());
    expect(remove).toHaveBeenCalledTimes(1);
    await act(async () => pending.reject(new Error('unmounted')));
    expect(fromError).not.toHaveBeenCalled();
  });

  it('does not read or subscribe on an unsupported platform', async () => {
    Object.defineProperty(manager, 'isSupported', { configurable: true, value: false });
    await act(async () => { renderer = create(<Probe />); });
    expect(latest.isLoading).toBe(false);
    expect(read).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('rejects results from a prior effect setup in StrictMode', async () => {
    const newer = deferred();
    (read as jest.Mock).mockReturnValueOnce(pending.promise).mockReturnValueOnce(newer.promise);
    await act(async () => { renderer = create(<StrictMode><Probe /></StrictMode>); });
    expect(remove).toHaveBeenCalledTimes(1);
    await act(async () => newer.resolve(update));
    await act(async () => pending.resolve(initial));
    expect(latest[key]).toEqual(update);
    await act(async () => renderer.unmount());
    expect(remove).toHaveBeenCalledTimes(2);
  });
});
