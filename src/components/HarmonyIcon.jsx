import React, { memo, useMemo } from 'react';
import HarmonyIcons from '../assets/harmonyIcons.js';

function pickIcon(name, variant) {
  let icon = HarmonyIcons?.[name];
  if (variant && icon && typeof icon === 'object') icon = icon?.[variant];
  return (typeof icon === 'string') ? icon : null;
}

function fitSvgToContainer(svg) {
  if (!svg || typeof svg !== 'string') return '';
  // 将根 <svg> 的 width/height 改为 100%，以便由外层 className 控制尺寸
  return svg.replace(/<svg([^>]*?)>/i, (m, attrs) => {
    let a = attrs || '';
    a = a.replace(/\swidth="[^"]*"/i, '');
    a = a.replace(/\sheight="[^"]*"/i, '');
    // 保留 viewBox（若已有），统一追加 width/height="100%"
    return `<svg${a} width="100%" height="100%">`;
  });
}

const HarmonyIcon = memo(({ name, variant, className = 'h-5 w-5', title, ...rest }) => {
  const raw = pickIcon(name, variant);
  const html = useMemo(() => fitSvgToContainer(raw), [raw]);
  if (!raw) return null;
  return (
    <span
      className={`inline-block ${className}`}
      role="img"
      aria-label={title || `${name}${variant ? `-${variant}` : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
      {...rest}
    />
  );
});

export default HarmonyIcon;
