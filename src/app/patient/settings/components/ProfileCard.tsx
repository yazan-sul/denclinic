interface ProfileCardProps {
  name: string;
  email: string;
  avatar?: string;
  onEditPhoto?: () => void;
}

export default function ProfileCard({
  name,
  email,
  avatar,
  onEditPhoto,
}: ProfileCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-3xl overflow-hidden">
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              '👤'
            )}
          </div>
          {onEditPhoto && (
            <button
              onClick={onEditPhoto}
              className="absolute -bottom-0 -right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:opacity-90 hover:cursor-pointer transition-opacity"
            >
              ✎
            </button>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h2 className="text-lg font-bold">{name}</h2>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>
    </div>
  );
}
