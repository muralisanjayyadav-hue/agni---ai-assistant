import React, { useState } from 'react';

export interface OrganImageProps {
  organ?: string;
  name?: string;
  alt?: string;
  className?: string;
  caption?: string;
}

// Organ image mapping with local vector SVGs and Wikimedia Commons anatomical fallbacks
const ORGAN_DATA: Record<string, { label: string; emoji: string; file: string; fallbackUrl: string; desc: string }> = {
  brain: {
    label: 'Brain',
    emoji: '🧠',
    file: '/organs/brain.svg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Brain.png/320px-Brain.png',
    desc: 'Central Nervous System Control Center',
  },
  heart: {
    label: 'Heart',
    emoji: '❤️',
    file: '/organs/heart.svg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Diagram_of_the_human_heart_%28cropped%29.svg/320px-Diagram_of_the_human_heart_%28cropped%29.svg.png',
    desc: 'Circulatory Muscular Pump',
  },
  lungs: {
    label: 'Lungs',
    emoji: '🫁',
    file: '/organs/lungs.svg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lungs_diagram_simple.svg/320px-Lungs_diagram_simple.svg.png',
    desc: 'Respiratory Gas Exchange System',
  },
  lung: {
    label: 'Lungs',
    emoji: '🫁',
    file: '/organs/lungs.svg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lungs_diagram_simple.svg/320px-Lungs_diagram_simple.svg.png',
    desc: 'Respiratory Gas Exchange System',
  },
  liver: {
    label: 'Liver',
    emoji: '🫀',
    file: '/organs/liver.svg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Liver_location.svg/320px-Liver_location.svg.png',
    desc: 'Metabolic Detoxification & Bile Center',
  },
  stomach: {
    label: 'Stomach',
    emoji: '🥣',
    file: '/organs/stomach.svg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Stomach_diagram.svg/320px-Stomach_diagram.svg.png',
    desc: 'Digestive Acid Breakdown Chamber',
  },
  kidneys: {
    label: 'Kidneys',
    emoji: '🩺',
    file: '/organs/kidneys.svg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Kidney_Structures.svg/320px-Kidney_Structures.svg.png',
    desc: 'Blood Filtration & Fluid Balance',
  },
  kidney: {
    label: 'Kidneys',
    emoji: '🩺',
    file: '/organs/kidneys.svg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Kidney_Structures.svg/320px-Kidney_Structures.svg.png',
    desc: 'Blood Filtration & Fluid Balance',
  },
  intestines: {
    label: 'Intestines',
    emoji: '🧬',
    file: '/organs/intestines.svg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Digestive_system_diagram_edit.svg/320px-Digestive_system_diagram_edit.svg.png',
    desc: 'Nutrient & Water Absorption',
  },
  intestine: {
    label: 'Intestines',
    emoji: '🧬',
    file: '/organs/intestines.svg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Digestive_system_diagram_edit.svg/320px-Digestive_system_diagram_edit.svg.png',
    desc: 'Nutrient & Water Absorption',
  },
  skin: {
    label: 'Skin',
    emoji: '🛡️',
    file: '/organs/skin.svg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Skin_layers.svg/320px-Skin_layers.svg.png',
    desc: 'Largest Protective Sensory Organ',
  },
  system: {
    label: 'Organ Systems',
    emoji: '🔄',
    file: '/organs/body_systems.svg',
    fallbackUrl: '/organs/body_systems.svg',
    desc: 'All Systems Working Together in Harmony',
  },
  body: {
    label: 'Human Body Systems',
    emoji: '🧍',
    file: '/organs/body_systems.svg',
    fallbackUrl: '/organs/body_systems.svg',
    desc: 'Interconnected Human Organ Network',
  },
};

export function resolveOrganKey(raw: string = ''): string | null {
  const clean = raw.toLowerCase().replace(/\[image:\s*|\]/gi, '').trim();
  for (const key of Object.keys(ORGAN_DATA)) {
    if (clean.includes(key)) {
      return key;
    }
  }
  return null;
}

export const OrganImage: React.FC<OrganImageProps> = ({ organ, name, alt, className = '', caption }) => {
  const query = organ || name || '';
  const organKey = resolveOrganKey(query) || 'brain';
  const data = ORGAN_DATA[organKey] || ORGAN_DATA.brain;
  const [imgSrc, setImgSrc] = useState<string>(data.file);
  const [hasError, setHasError] = useState<boolean>(false);

  const handleError = () => {
    if (!hasError && imgSrc !== data.file) {
      setImgSrc(data.file);
      setHasError(true);
    }
  };

  return (
    <div className={`my-3 flex items-center gap-3.5 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-2.5 sm:p-3 shadow-lg shadow-black/40 backdrop-blur-md transition-all duration-300 hover:border-orange-500/50 hover:bg-neutral-900 ${className}`}>
      {/* 80x80 Anatomical Diagram Image (Left) */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-neutral-700/80 bg-black/60 shadow-inner flex items-center justify-center group">
        <img
          src={imgSrc}
          alt={alt || `${data.label} anatomy diagram`}
          onError={handleError}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <span className="absolute bottom-1 right-1 rounded-md bg-black/80 px-1 text-[10px] leading-tight shadow">
          {data.emoji}
        </span>
      </div>

      {/* Text Info / Caption (Right) */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
            {data.emoji} {data.label} Anatomy
          </span>
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-neutral-300">
            Vital Organ
          </span>
        </div>
        <p className="mt-0.5 text-xs font-medium text-neutral-300 line-clamp-2">
          {caption || data.desc}
        </p>
        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-neutral-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Anatomical reference diagram
        </span>
      </div>
    </div>
  );
};

export default OrganImage;
