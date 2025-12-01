import React from 'react';
import { Plus } from 'lucide-react';
import DateNavigator from './components/DateNavigator';
import WodCard from './components/WodCard';
import LeaderboardPreview from './components/LeaderboardPreview';
import EmptyWodState from './components/EmptyWodState';
import Button from '../../components/Button';

const CalendarView = ({
  selectedDate,
  onDateChange,
  todaysWods,
  getWodLeaderboard,
  onLogScore,
  canManage,
  onDeleteWod,
  onEditWod,
  onAddWod,
  onFindGym,
  onViewLeaderboard,
}) => {
  return (
    <>
      <DateNavigator date={selectedDate} setDate={onDateChange} />
      <div className="space-y-6">
        {todaysWods.map(wod => (
          <div key={wod.id}>
            <WodCard 
              wod={wod} 
              onLog={() => onLogScore(wod)} 
              isAdmin={canManage} 
              onDelete={() => onDeleteWod(wod.id)} 
              onEdit={() => onEditWod(wod)}
            />
            <LeaderboardPreview 
              scores={getWodLeaderboard(wod.id)} 
              onMore={() => onViewLeaderboard(wod.id)}
            />
          </div>
        ))}
        {todaysWods.length === 0 && (
          <EmptyWodState 
            canCreate={canManage} 
            onCreate={onAddWod} 
            onFindGym={onFindGym}
          />
        )}
        {todaysWods.length > 0 && canManage && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={onAddWod}>
              <Plus size={16}/> Aggiungi WOD
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default CalendarView;
