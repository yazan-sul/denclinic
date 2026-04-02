import React from 'react';

interface IconProps {
  className?: string;
  fill?: string;
  viewBox?: string;
}

// Theme Icons
export const SunIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 17a1 1 0 100-2h-1a1 1 0 100 2h1zm-7-4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 103.636 5.05l-.707.707a1 1 0 101.414 1.414l.707-.707zm5.414-1.414l.707-.707a1 1 0 00-1.414-1.414l-.707.707a1 1 0 101.414 1.414zM5 6a1 1 0 100-2H4a1 1 0 000 2h1z" clipRule="evenodd" />
  </svg>
);

export const MoonIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
  </svg>
);

export const SystemIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm12 4v4a2 2 0 002-2v-4a2 2 0 00-2 2zM2 9a1 1 0 100-2 1 1 0 000 2z" />
  </svg>
);

// Navigation Icons
export const HomeIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" />
  </svg>
);

export const UsersIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

export const MessageIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
  </svg>
);

export const ReportsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
);

// Sidebar Control Icons
export const ChevronLeftIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M12.79 5.197a.75.75 0 01.03 1.06L7.844 12l4.976 5.743a.75.75 0 11-1.129.98l-5.5-6.33a.75.75 0 010-1.06l5.5-6.33a.75.75 0 011.06-.03z" clipRule="evenodd" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M7.21 14.803a.75.75 0 01-.03-1.06L12.156 8l-4.976-5.743a.75.75 0 111.129-.98l5.5 6.33a.75.75 0 010 1.06l-5.5 6.33a.75.75 0 01-1.06.03z" clipRule="evenodd" />
  </svg>
);

// Dashboard Stats Icons
export const InvoiceIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path d="M8.16 2.75a.75.75 0 00-1.32 0l-3.5 9.5A.75.75 0 003.75 13h12.5a.75.75 0 00.66-1.25l-3.5-9.5z" />
  </svg>
);

// Utility Icons
export const LogoutIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-2 0V4H4v12h10v-1a1 1 0 012 0v2a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" clipRule="evenodd" />
  </svg>
);

export const NotificationIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path d="M10.5 1.5H4.75A3.25 3.25 0 001.5 4.75v10.5a3.25 3.25 0 003.25 3.25h10.5a3.25 3.25 0 003.25-3.25V9.5m-15-4h16m-10 10v-6" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

export const ProfileIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);

export const DocumentIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path d="M4 4a2 2 0 012-2h6a1 1 0 00-.707.293L6.293 6.586a1 1 0 101.414 1.414l.293-.293h5a2 2 0 012 2v5a1 1 0 11-2 0V9a1 1 0 00-1-1H5a1 1 0 00-1 1v5a1 1 0 11-2 0V4z" />
    <path d="M8 16a1 1 0 11-2 0 1 1 0 012 0z" />
  </svg>
);

export const StarIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', fill = 'currentColor' }) => (
  <svg className={className} fill={fill} viewBox="0 0 20 20">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);
