// ABOUT: Unit tests for GameOverDialog pure helpers.
// ABOUT: Component rendering tests are deferred — see spec line 62, "3D component tests stay light".

import { describe, it, expect } from 'vitest';
import { describeReason } from '../../../src/client/components/game/GameOverDialog';

describe('describeReason', () => {
  it('king-captured: headline names the King, detail mentions four sides', () => {
    const result = describeReason({ kind: 'king-captured' });
    expect(result.headline).toContain('King');
    expect(result.detail).toMatch(/four sides/i);
  });

  it('king-escaped: headline names the King, detail mentions corner', () => {
    const result = describeReason({ kind: 'king-escaped' });
    expect(result.headline).toContain('King');
    expect(result.detail).toMatch(/corner/i);
  });

  it('no-legal-moves (attackers stuck): headline mentions attackers', () => {
    const result = describeReason({ kind: 'no-legal-moves', stuckSide: 'attackers' });
    expect(result.headline.toLowerCase()).toContain('attacker');
    expect(result.detail.toLowerCase()).toContain('attacker');
  });

  it('no-legal-moves (defenders stuck): headline mentions defenders', () => {
    const result = describeReason({ kind: 'no-legal-moves', stuckSide: 'defenders' });
    expect(result.headline.toLowerCase()).toContain('defender');
    expect(result.detail.toLowerCase()).toContain('defender');
  });

  it('attackers-insufficient: headline indicates siege is broken', () => {
    const result = describeReason({ kind: 'attackers-insufficient' });
    expect(result.headline.toLowerCase()).toContain('siege');
    expect(result.detail).toMatch(/three/i);
  });

  it('all variants return non-empty headline and detail', () => {
    const variants = [
      describeReason({ kind: 'king-captured' }),
      describeReason({ kind: 'king-escaped' }),
      describeReason({ kind: 'no-legal-moves', stuckSide: 'attackers' }),
      describeReason({ kind: 'no-legal-moves', stuckSide: 'defenders' }),
      describeReason({ kind: 'attackers-insufficient' }),
    ];
    for (const v of variants) {
      expect(v.headline.length).toBeGreaterThan(0);
      expect(v.detail.length).toBeGreaterThan(0);
    }
  });
});
