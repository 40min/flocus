import { renderHook, act } from '@testing-library/react';
import { useMenuState } from './useMenuState';

const LOCAL_STORAGE_KEY = 'menuOpen';

describe('useMenuState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with true if localStorage is empty', () => {
    const { result } = renderHook(() => useMenuState());
    expect(result.current.isMenuOpen).toBe(true);
  });

  it('should initialize with false from localStorage', () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'false');
    const { result } = renderHook(() => useMenuState());
    expect(result.current.isMenuOpen).toBe(false);
  });

  it('should initialize with true from localStorage', () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
    const { result } = renderHook(() => useMenuState());
    expect(result.current.isMenuOpen).toBe(true);
  });

  it('should toggle the state', () => {
    const { result } = renderHook(() => useMenuState());
    expect(result.current.isMenuOpen).toBe(true);

    act(() => {
      result.current.toggleMenu();
    });

    expect(result.current.isMenuOpen).toBe(false);

    act(() => {
      result.current.toggleMenu();
    });

    expect(result.current.isMenuOpen).toBe(true);
  });

  it('should update localStorage when state changes', () => {
    const { result } = renderHook(() => useMenuState());

    act(() => {
      result.current.toggleMenu();
    });

    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('false');

    act(() => {
      result.current.toggleMenu();
    });

    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('true');
  });
});
