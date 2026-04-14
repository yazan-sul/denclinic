'use client';

import { useState } from 'react';
import { ClockIcon } from '@/components/Icons';

interface Period {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
}

const TimeSlotManager = () => {
  const [periods, setPeriods] = useState<Period[]>([
    { id: 1, date: '2026-04-14', startTime: '09:00', endTime: '13:00' },
    { id: 2, date: '2026-04-14', startTime: '14:00', endTime: '17:00' },
    { id: 3, date: '2026-04-15', startTime: '09:00', endTime: '17:00' },
    { id: 4, date: '2026-04-16', startTime: '09:00', endTime: '13:00' },
    { id: 5, date: '2026-04-17', startTime: '10:00', endTime: '18:00' },
    { id: 6, date: '2026-05-05', startTime: '09:00', endTime: '17:00' },
  ]);

  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 14)); // April 14, 2026
  const [selectedDate, setSelectedDate] = useState('2026-04-14');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ startTime: '', endTime: '' });

  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];

  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const today = '2026-04-14';

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isDatePast = (date: string) => {
    return date < today;
  };

  const getPeriodsForDate = (date: string) => {
    return periods.filter((p) => p.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const startEditing = (period: Period) => {
    setEditingId(period.id);
    setEditForm({ startTime: period.startTime, endTime: period.endTime });
  };

  const saveEdit = (id: number) => {
    setPeriods(
      periods.map((period) =>
        period.id === id
          ? { ...period, startTime: editForm.startTime, endTime: editForm.endTime }
          : period
      )
    );
    setEditingId(null);
  };

  const deletePeriod = (id: number) => {
    setPeriods(periods.filter((period) => period.id !== id));
  };

  const addPeriod = (date: string) => {
    setPeriods([
      ...periods,
      {
        id: Date.now(),
        date,
        startTime: '09:00',
        endTime: '12:00',
      },
    ]);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) =>
    formatDate(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
  );

  const emptyDays = Array(firstDay).fill(null);

  const selectedDateObj = new Date(selectedDate);
  const selectedDayName = dayNames[selectedDateObj.getDay()];
  const selectedPeriods = getPeriodsForDate(selectedDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">جدول العمل</h2>
        <p className="text-sm text-muted-foreground mt-1">اختر يوم واحد لإضافة أو تعديل فترات العمل</p>
      </div>

      {/* Month Selector */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPreviousMonth}
            className="px-4 py-2 text-sm font-medium bg-secondary hover:bg-secondary/80 rounded transition-colors"
          >
            ←
          </button>
          <h3 className="text-xl font-semibold">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={goToNextMonth}
            className="px-4 py-2 text-sm font-medium bg-secondary hover:bg-secondary/80 rounded transition-colors"
          >
            →
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers - Full Arabic names */}
          {dayNames.map((day) => (
            <div key={day} className="text-center py-2 font-semibold text-sm text-muted-foreground">
              {day.substring(0, 2)}
            </div>
          ))}

          {/* Empty cells */}
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`}></div>
          ))}

          {/* Day cells */}
          {calendarDays.map((date) => {
            const dayNumber = parseInt(date.split('-')[2]);
            const isPast = isDatePast(date);
            const isSelected = selectedDate === date;
            const hasPeriods = getPeriodsForDate(date).length > 0;
            const isToday = date === today;

            return (
              <button
                key={date}
                onClick={() => !isPast && setSelectedDate(date)}
                disabled={isPast}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  isPast
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50 dark:border-gray-700 dark:bg-gray-900/20'
                    : isSelected
                    ? 'border-primary bg-primary/10'
                    : hasPeriods
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-border hover:border-primary/50 cursor-pointer'
                } ${isToday && !isPast ? 'ring-2 ring-blue-400' : ''}`}
              >
                <p className={`font-semibold text-sm ${isToday && !isPast ? 'text-blue-600' : ''}`}>
                  {dayNumber}
                </p>
                {hasPeriods && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {getPeriodsForDate(date).length}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Past dates note */}
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-900/30 rounded text-xs text-muted-foreground text-center">
          الأيام الرمادية: أيام ماضية (يمكنك فقط تحديد أيام حالية أو مستقبلية)
        </div>
      </div>

      {/* Selected Day Schedule */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">اليوم المختار</p>
            <h3 className="text-xl font-semibold mt-1">
              {selectedDayName} - {selectedDate}
            </h3>
          </div>
          <button
            onClick={() => addPeriod(selectedDate)}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors cursor-pointer"
          >
            + إضافة فترة عمل
          </button>
        </div>

        {/* Periods List */}
        {selectedPeriods.length > 0 ? (
          <div className="space-y-3">
            {selectedPeriods.map((period) => (
              <div key={period.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-5 h-5 text-primary opacity-70" />
                  {editingId === period.id ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="time"
                        value={editForm.startTime}
                        onChange={(e) =>
                          setEditForm({ ...editForm, startTime: e.target.value })
                        }
                        className="px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-muted-foreground">-</span>
                      <input
                        type="time"
                        value={editForm.endTime}
                        onChange={(e) =>
                          setEditForm({ ...editForm, endTime: e.target.value })
                        }
                        className="px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  ) : (
                    <span className="font-semibold text-lg">
                      {period.startTime} - {period.endTime}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {editingId === period.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(period.id)}
                        className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors cursor-pointer"
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-sm font-medium bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                      >
                        إلغاء
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(period)}
                        className="px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => deletePeriod(period.id)}
                        className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors cursor-pointer"
                      >
                        حذف
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-4">لم يتم إضافة فترات عمل ليوم {selectedDayName}</p>
            <button
              onClick={() => addPeriod(selectedDate)}
              className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors border border-primary/20 cursor-pointer"
            >
              + إضافة الفترة الأولى
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeSlotManager;
