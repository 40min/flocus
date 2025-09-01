import '@testing-library/jest-dom';

// Suppress expected jsdom console messages during tests
const originalConsoleError = console.error;
let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  // Suppress "Cross origin http://localhost forbidden" errors from jsdom XHR
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('Cross origin') && message.includes('forbidden')) {
      return; // Suppress expected jsdom CORS errors
    }
    originalConsoleError(...args); // Allow unexpected errors to show
  });
});

afterAll(() => {
  // Restore console.error
  consoleErrorSpy.mockRestore();
});

// Create a modal root element before each test
beforeEach(() => {
  const modalRoot = document.createElement('div');
  modalRoot.setAttribute('id', 'modal-root');
  document.body.appendChild(modalRoot);
});

// Clean up the modal root element after each test
afterEach(() => {
  const modalRoot = document.getElementById('modal-root');
  if (modalRoot) {
    document.body.removeChild(modalRoot);
  }
});
