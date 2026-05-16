// ABOUT: Tests for usePieceStyle hook — localStorage persistence, default value, type union.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePieceStyle } from '../../../src/client/hooks/usePieceStyle';

const STORAGE_KEY = 'hnefatafl-piece-style';

describe('usePieceStyle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to ornate when localStorage is empty', () => {
    const { result } = renderHook(() => usePieceStyle());
    expect(result.current.style).toBe('ornate');
  });

  it('reads an existing ornate value from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'ornate');
    const { result } = renderHook(() => usePieceStyle());
    expect(result.current.style).toBe('ornate');
  });

  it('reads an existing textured value from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'textured');
    const { result } = renderHook(() => usePieceStyle());
    expect(result.current.style).toBe('textured');
  });

  it('ignores unknown values in localStorage and falls back to ornate', () => {
    localStorage.setItem(STORAGE_KEY, 'classic');
    const { result } = renderHook(() => usePieceStyle());
    expect(result.current.style).toBe('ornate');
  });

  it('setStyle updates the state', () => {
    const { result } = renderHook(() => usePieceStyle());
    act(() => {
      result.current.setStyle('textured');
    });
    expect(result.current.style).toBe('textured');
  });

  it('setStyle persists the value to localStorage', () => {
    const { result } = renderHook(() => usePieceStyle());
    act(() => {
      result.current.setStyle('textured');
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('textured');
  });

  it('setStyle back to ornate persists ornate', () => {
    const { result } = renderHook(() => usePieceStyle());
    act(() => { result.current.setStyle('textured'); });
    act(() => { result.current.setStyle('ornate'); });
    expect(result.current.style).toBe('ornate');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('ornate');
  });

  it('new hook instance picks up value written by previous setStyle', () => {
    const { result: a } = renderHook(() => usePieceStyle());
    act(() => { a.current.setStyle('textured'); });

    const { result: b } = renderHook(() => usePieceStyle());
    expect(b.current.style).toBe('textured');
  });
});
