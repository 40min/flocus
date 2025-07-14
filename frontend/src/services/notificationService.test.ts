import { act } from 'react';

describe('notificationService', () => {
  const originalNotification = window.Notification;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    jest.resetModules();
    console.warn = jest.fn((message, ...args) => {
      if (message.includes('This browser does not support desktop notification')) {
        return;
      }
      originalConsoleWarn(message, ...args);
    });
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
    window.Notification = originalNotification;
  });

  describe('requestPermission', () => {
    it('should call Notification.requestPermission', async () => {
      const mockRequestPermission = jest.fn().mockResolvedValue('granted');
      // @ts-ignore
      window.Notification = {
        requestPermission: mockRequestPermission,
      };

      let requestPermission: any;
      await act(async () => {
        ({ requestPermission } = await import('./notificationService'));
        await requestPermission();
      });
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    });

    it('should return "denied" if notifications are not supported', async () => {
      // @ts-ignore
      delete window.Notification;
      let requestPermission: any;
      await act(async () => {
        ({ requestPermission } = await import('./notificationService'));
        const permission = await requestPermission();
        expect(permission).toBe('denied');
      });
    });
  });

  describe('showNotification', () => {
    it('should create a new Notification if permission is granted', async () => {
      const mockNotification = jest.fn();
      // @ts-ignore
      window.Notification = mockNotification;
      Object.defineProperty(window.Notification, 'permission', {
        writable: true,
        value: 'granted',
      });
      let showNotification: any;
      await act(async () => {
        ({ showNotification } = require('./notificationService'));
        showNotification('Test Title', { body: 'Test Body' });
      });
      expect(mockNotification).toHaveBeenCalledWith('Test Title', {
        body: 'Test Body',
        icon: '/logo192.png',
      });
    });

    it('should not create a new Notification if permission is denied', async () => {
      const mockNotification = jest.fn();
      // @ts-ignore
      window.Notification = mockNotification;
      Object.defineProperty(window.Notification, 'permission', {
        writable: true,
        value: 'denied',
      });
      let showNotification: any;
      await act(async () => {
        ({ showNotification } = require('./notificationService'));
        showNotification('Test Title', { body: 'Test Body' });
      });
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should not create a new Notification if permission is default', async () => {
      const mockNotification = jest.fn();
      // @ts-ignore
      window.Notification = mockNotification;
      Object.defineProperty(window.Notification, 'permission', {
        writable: true,
        value: 'default',
      });
      let showNotification: any;
      await act(async () => {
        ({ showNotification } = require('./notificationService'));
        showNotification('Test Title', { body: 'Test Body' });
      });
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should not fail if notifications are not supported', async () => {
      // @ts-ignore
      delete window.Notification;
      let showNotification: any;
      await act(async () => {
        ({ showNotification } = require('./notificationService'));
        expect(() => showNotification('Test Title')).not.toThrow();
      });
    });
  });
});
