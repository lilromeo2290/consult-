import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Read assembly name + description from localStorage settings. */
export function getAssemblyInfo(): { name: string; description: string } {
  try {
    const r = JSON.parse(localStorage.getItem('rms-settings-assembly') || '{}');
    return {
      name: r.name || 'Kpando Municipal Assembly',
      description: r.description || '',
    };
  } catch {
    return { name: 'Kpando Municipal Assembly', description: '' };
  }
}

/** Build the print header HTML with assembly name + optional description. */
export function assemblyHeaderHTML(subtitle?: string): string {
  const { name, description } = getAssemblyInfo();
  const descLine = description
    ? `<p style="font-size:11px;color:#64748b;margin-top:3px;line-height:1.4;">${description}</p>`
    : '';
  const subLine = subtitle
    ? `<p style="font-size:11px;color:#64748b;margin-top:${description ? '2' : '4'}px;">${subtitle}</p>`
    : '';
  return `<h1>${name.toUpperCase()}</h1>${descLine}${subLine}`;
}
