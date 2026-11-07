import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PointsGallery, SCENES } from '../components/PointsMood';

const shareFor = () => 'share';

describe('the points screens gallery', () => {
  it('shows only the scenes the player got; every other one is dark and locked', () => {
    render(<PointsGallery selected={null} onSelect={() => undefined} shareFor={shareFor} seen={new Set([300, 675])} />);

    expect(screen.getAllByLabelText('شاشة مقفولة')).toHaveLength(SCENES.length - 2);
    expect(screen.getByText('⚽')).toBeInTheDocument(); // 300
    expect(screen.getByText('🚀')).toBeInTheDocument(); // 675
    expect(screen.queryByText('🏆')).toBeNull(); // 1000 is still locked: its face is not revealed
    expect(screen.queryByText('+1000')).toBeNull();
    expect(document.body.textContent).toContain('فتحت 2 من 41');
  });

  it('opens an unlocked scene, and only an unlocked one', () => {
    const onSelect = vi.fn();
    render(<PointsGallery selected={null} onSelect={onSelect} shareFor={shareFor} seen={new Set([300])} />);

    fireEvent.click(screen.getAllByLabelText('شاشة مقفولة')[0]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('العب وحقق النتيجة');

    fireEvent.click(screen.getByText('+300'));
    expect(onSelect).toHaveBeenCalledWith(300);
  });

  it('does not open a locked scene from its address either', () => {
    render(<PointsGallery selected={900} onSelect={() => undefined} shareFor={shareFor} seen={new Set([300])} />);

    expect(screen.getAllByLabelText('شاشة مقفولة')).toHaveLength(SCENES.length - 1);
    expect(screen.queryByText('ملك الكورة!')).toBeNull();
  });

  it('shows an unlocked scene opened from its address', () => {
    render(<PointsGallery selected={300} onSelect={() => undefined} shareFor={shareFor} seen={new Set([300])} />);
    expect(screen.getByText('جووول!')).toBeInTheDocument();
  });

  it('starts fully dark for a player who has finished no play', () => {
    render(<PointsGallery selected={null} onSelect={() => undefined} shareFor={shareFor} seen={new Set()} />);
    expect(screen.getAllByLabelText('شاشة مقفولة')).toHaveLength(SCENES.length);
    expect(document.body.textContent).toContain('فتحت 0 من 41');
  });
});

describe('the scenes', () => {
  it('has one screen for every possible play result, 0 to 1000 in steps of 25', async () => {
    const { sceneFor } = await import('../data/pointsScenes');
    expect(SCENES).toHaveLength(41);
    SCENES.forEach((sc, i) => expect(sc.score).toBe(i * 25));
    expect(sceneFor(-30).score).toBe(0);
    expect(sceneFor(87).score).toBe(75);
    expect(sceneFor(5000).score).toBe(1000);
  });
});
