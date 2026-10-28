import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PointsGallery, SCENES } from '../components/PointsMood';

const shareFor = () => 'share';

describe('the points screens gallery', () => {
  it('shows only the scenes the player got; every other one is dark and locked', () => {
    render(<PointsGallery selected={null} onSelect={() => undefined} shareFor={shareFor} seen={new Set([-40, 70])} />);

    expect(screen.getAllByLabelText('شاشة مقفولة')).toHaveLength(SCENES.length - 2);
    expect(screen.getByText('😢')).toBeInTheDocument(); // -40
    expect(screen.getByText('🚀')).toBeInTheDocument(); // +70
    expect(screen.queryByText('🏆')).toBeNull(); // +100 is still locked: its face is not revealed
    expect(screen.queryByText('+100')).toBeNull();
    expect(document.body.textContent).toContain('فتحت 2 من 20');
  });

  it('opens an unlocked scene, and only an unlocked one', () => {
    const onSelect = vi.fn();
    render(<PointsGallery selected={null} onSelect={onSelect} shareFor={shareFor} seen={new Set([-40])} />);

    fireEvent.click(screen.getAllByLabelText('شاشة مقفولة')[0]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('العب وحقق النتيجة');

    fireEvent.click(screen.getByText('-40'));
    expect(onSelect).toHaveBeenCalledWith(-40);
  });

  it('does not open a locked scene from its address either', () => {
    render(<PointsGallery selected={90} onSelect={() => undefined} shareFor={shareFor} seen={new Set([-40])} />);

    expect(screen.getAllByLabelText('شاشة مقفولة')).toHaveLength(SCENES.length - 1);
    expect(screen.queryByText('ملك الكورة!')).toBeNull();
  });

  it('shows an unlocked scene opened from its address', () => {
    render(<PointsGallery selected={-40} onSelect={() => undefined} shareFor={shareFor} seen={new Set([-40])} />);
    expect(screen.getByText('خسارة صغيرة، وهتعوّضها!')).toBeInTheDocument();
  });

  it('starts fully dark for a player who has finished no play', () => {
    render(<PointsGallery selected={null} onSelect={() => undefined} shareFor={shareFor} seen={new Set()} />);
    expect(screen.getAllByLabelText('شاشة مقفولة')).toHaveLength(SCENES.length);
    expect(document.body.textContent).toContain('فتحت 0 من 20');
  });
});
