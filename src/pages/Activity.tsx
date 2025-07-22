import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogIn, User, Settings } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'sign_in':
      return <LogIn className="h-4 w-4" />;
    case 'profile_update':
      return <Settings className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'sign_in':
      return 'bg-green-500';
    case 'profile_update':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

export default function Activity() {
  const { user } = useAuth();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Activity</h1>
          <p className="text-muted-foreground">
            Track your recent sign-ins, profile updates, and other activities
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your activity history over the past few sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!activities || activities.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No activity recorded yet</p>
                <p className="text-sm text-muted-foreground">
                  Your future sign-ins and profile updates will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)} text-white`}>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground">
                          {activity.description || activity.activity_type}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {activity.activity_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {Object.entries(activity.metadata).map(([key, value]) => (
                            <span key={key} className="mr-4">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="mt-2 flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}