import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExport } from '../hooks/useExport';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { renderHook, act } from '@testing-library/react';

describe('useExport Hook', () => {
  it('should initialize with isExporting false', () => {
    const { result } = renderHook(() => useExport());
    expect(result.current.isExporting).toBe(false);
  });
});

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should use initial value if localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    
    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(window.localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
  });

  it('should initialize from existing localStorage value', () => {
    window.localStorage.setItem('test-key', JSON.stringify('existing'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
    expect(result.current[0]).toBe('existing');
  });
});
