'use client';

import { useState } from 'react';

export interface PatientProfile {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodType: string;
  nationalId: string;
  address: string;
  city: string;
  emergencyContact: string;
  emergencyPhone: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  appointmentReminders: boolean;
  promotions: boolean;
  weeklyReport: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showOnlineStatus: boolean;
  allowDataCollection: boolean;
  allowThirdParty: boolean;
}

export interface AppointmentPreferences {
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'any';
  reminderBefore: number;
  autoConfirm: boolean;
  allowCancellation: boolean;
}

const DEFAULT_PROFILE: PatientProfile = {
  name: 'محمد أحمد علي',
  email: 'mohammad@example.com',
  phone: '+966501234567',
  dateOfBirth: '1995-03-15',
  gender: 'male',
  bloodType: 'O+',
  nationalId: '1234567890',
  address: 'شارع الملك فهد، البناء 123',
  city: 'الرياض',
  emergencyContact: 'أحمد محمد (الأب)',
  emergencyPhone: '+966509876543',
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  emailNotifications: true,
  smsNotifications: true,
  appointmentReminders: true,
  promotions: false,
  weeklyReport: true,
};

const DEFAULT_PRIVACY: PrivacySettings = {
  profileVisibility: 'private',
  showOnlineStatus: false,
  allowDataCollection: true,
  allowThirdParty: false,
};

const DEFAULT_APPOINTMENTS: AppointmentPreferences = {
  preferredTime: 'morning',
  reminderBefore: 24,
  autoConfirm: true,
  allowCancellation: true,
};

export function useSettingsState() {
  const [profile, setProfile] = useState<PatientProfile>(DEFAULT_PROFILE);
  const [editData, setEditData] = useState<PatientProfile>(DEFAULT_PROFILE);
  const [isEditing, setIsEditing] = useState(false);

  const [notifications, setNotifications] =
    useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [appointments, setAppointments] = useState<AppointmentPreferences>(
    DEFAULT_APPOINTMENTS
  );

  const handleSaveProfile = () => {
    setProfile(editData);
    setIsEditing(false);
  };

  const handleCancelProfile = () => {
    setEditData(profile);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditData(profile);
    setIsEditing(true);
  };

  const getAgeFromBirthDate = (dateString: string) => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  return {
    // Profile
    profile,
    editData,
    isEditing,
    setEditData,
    handleSaveProfile,
    handleCancelProfile,
    handleStartEdit,
    getAgeFromBirthDate,

    // Notifications
    notifications,
    setNotifications,

    // Privacy
    privacy,
    setPrivacy,

    // Appointments
    appointments,
    setAppointments,
  };
}
