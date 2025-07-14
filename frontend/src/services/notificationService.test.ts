describe('notificationService', () => {
  const originalNotification = window.Notification;

  afterEach(() => {
    window.Notification = originalNotification;
    jest.resetModules();
  });
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((message, ...args) => {
      if (message.includes('This browser does not support desktop notification')) {
        return;
      }
      originalConsoleWarn(message, ...args);
    });
  });

  const originalConsoleWarn = console.warn;

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    window.Notification = originalNotification;
    jest.resetModules();
  });

  describe('requestPermission', () => {
    it('should call Notification.requestPermission', async () => {
      const mockRequestPermission = jest.fn().mockResolvedValue('granted');
      // @ts-ignore
      window.Notification = {
        requestPermission: mockRequestPermission,
      };

      const { requestPermission } = await import('./notificationService');
      await requestPermission();
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    });

    it('should return "denied" if notifications are not supported', async () => {
      // @ts-ignore
      delete window.Notification;
      const { requestPermission } = await import('./notificationService');

      const permission = await requestPermission();
      expect(permission).toBe('denied');
    });
  });

  describe('showNotification', () => {
    it('should create a new Notification if permission is granted', () => {
      const mockNotification = jest.fn();
      // @ts-ignore
      window.Notification = mockNotification;
      Object.defineProperty(window.Notification, 'permission', {
        writable: true,
        value: 'granted',
      });
      const { showNotification } = require('./notificationService');
      showNotification('Test Title', { body: 'Test Body' });
      expect(mockNotification).toHaveBeenCalledWith('Test Title', {
        body: 'Test Body',
        icon: '/logo192.png',
      });
    });

    it('should not create a new Notification if permission is denied', () => {
      const mockNotification = jest.fn();
      // @ts-ignore
      window.Notification = mockNotification;
      Object.defineProperty(window.Notification, 'permission', {
        writable: true,
        value: 'denied',
      });
      const { showNotification } = require('./notificationService');
      showNotification('Test Title', { body: 'Test Body' });
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should not create a new Notification if permission is default', () => {
      const mockNotification = jest.fn();
      // @ts-ignore
      window.Notification = mockNotification;
      Object.defineProperty(window.Notification, 'permission', {
        writable: true,
        value: 'default',
      });
      const { showNotification } = require('./notificationService');
      showNotification('Test Title', { body: 'Test Body' });
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should not fail if notifications are not supported', () => {
      // @ts-ignore
      delete window.Notification;
      const { showNotification } = require('./notificationService');


      expect(() => showNotification('Test Title')).not.toThrow();
    });
  });
});
export {};
