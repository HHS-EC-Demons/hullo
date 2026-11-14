import EyesFacade, { type Poster } from './EyesFacade';
import { EYES_PARAMS, probeInfo } from '../data/probes';
import { usePicked } from '../lib/picked';

const SIZES = '(max-width: 900px) calc(100vw - 32px), min(92vw, 1320px)';

export default function ProbeEyes({ posters }: { posters: Record<string, Poster> }) {
  const probe = usePicked();
  const info = probeInfo(probe);
  const poster = posters[probe];
  if (!poster) return null;
  return (
    <EyesFacade
      className="eyes-wide"
      poster={poster}
      src={`https://eyes.nasa.gov/apps/solar-system/#/${info.eyes}?${EYES_PARAMS}`}
      title={`NASA Eyes on the Solar System, 3D view of ${info.name}`}
      label="Open in 3D"
      sizes={SIZES}
    />
  );
}
