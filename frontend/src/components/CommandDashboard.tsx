import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Play, 
  Package, 
  Rocket, 
  TestTube, 
  Shield, 
  Activity,
  Terminal,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { commandAPI } from '@/lib/api';

const categoryConfig = {
  build: { icon: Package, color: 'text-info' },
  deploy: { icon: Rocket, color: 'text-primary' },
  test: { icon: TestTube, color: 'text-warning' },
  security: { icon: Shield, color: 'text-destructive' },
  monitoring: { icon: Activity, color: 'text-success' },
};

interface CommandLog {
  id: string;
  command: string;
  status: 'running' | 'success' | 'failed';
  timestamp: Date;
  output?: string;
}

export function CommandDashboard() {
  const { user } = useAuth();
  const [commands, setCommands] = useState<Command[]>([]);
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [runningCommands, setRunningCommands] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCommand, setNewCommand] = useState({
    name: '',
    description: '',
    command: '',
    category: 'build' as 'build' | 'deploy' | 'test' | 'security' | 'monitoring',
  });

  useEffect(() => {
    loadCommands();
  }, []);

  const loadCommands = async () => {
    try {
      const data = await commandAPI.getCommands();
      setCommands(data.map((cmd: any) => ({
        id: cmd.id.toString(),
        name: cmd.name,
        description: cmd.description,
        command: cmd.command,
        category: cmd.category,
        isEnabled: cmd.is_enabled,
      })));
    } catch (error) {
      console.error('Failed to load commands:', error);
      toast.error('Failed to load commands');
    }
  };

  const executeCommand = async (cmd: Command) => {
    const logId = `${cmd.id}-${Date.now()}`;
    
    setRunningCommands(prev => new Set(prev).add(cmd.id));
    setCommandLogs(prev => [{
      id: logId,
      command: cmd.command,
      status: 'running' as const,
      timestamp: new Date(),
    }, ...prev].slice(0, 10));

    toast.info(`Executing: ${cmd.command}`);

    try {
      const result = await commandAPI.executeCommand(parseInt(cmd.id));
      
      // Poll for command completion (in real app, use WebSockets)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const success = result.status === 'success';
      
      setCommandLogs(prev => prev.map(log => 
        log.id === logId 
          ? { ...log, status: success ? 'success' : 'failed', output: result.output || 'Command completed' }
          : log
      ));

      if (success) {
        toast.success(`${cmd.name} completed successfully`);
      } else {
        toast.error(`${cmd.name} failed`);
      }
    } catch (error) {
      console.error('Command execution failed:', error);
      setCommandLogs(prev => prev.map(log => 
        log.id === logId 
          ? { ...log, status: 'failed', output: 'Error: Command execution failed' }
          : log
      ));
      toast.error(`${cmd.name} failed`);
    } finally {
      setRunningCommands(prev => {
        const next = new Set(prev);
        next.delete(cmd.id);
        return next;
      });
    }
  };

  const handleCreateCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCommand.name || !newCommand.command) {
      toast.error('Name and command are required');
      return;
    }

    try {
      await commandAPI.createCommand({
        name: newCommand.name,
        description: newCommand.description,
        command: newCommand.command,
        category: newCommand.category,
        is_enabled: true,
      });
      
      toast.success('Command created successfully');
      setIsDialogOpen(false);
      setNewCommand({
        name: '',
        description: '',
        command: '',
        category: 'build',
      });
      loadCommands();
    } catch (error) {
      console.error('Failed to create command:', error);
      toast.error('Failed to create command. Admin access required.');
    }
  };

  const categories = ['build', 'deploy', 'test', 'security', 'monitoring'] as const;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Commands Panel */}
      <div className="lg:col-span-2 space-y-6">
        {/* Add Command Button - Only for Admins */}
        {user?.role === 'admin' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="terminal" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add New Command
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Command</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCommand} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Command Name</Label>
                  <Input
                    id="name"
                    value={newCommand.name}
                    onChange={(e) => setNewCommand({ ...newCommand, name: e.target.value })}
                    placeholder="e.g., Build Docker Image"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="command">Command</Label>
                  <Input
                    id="command"
                    value={newCommand.command}
                    onChange={(e) => setNewCommand({ ...newCommand, command: e.target.value })}
                    placeholder="e.g., docker build -t myapp ."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newCommand.description}
                    onChange={(e) => setNewCommand({ ...newCommand, description: e.target.value })}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newCommand.category}
                    onValueChange={(value: any) => setNewCommand({ ...newCommand, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="build">Build</SelectItem>
                      <SelectItem value="deploy">Deploy</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="terminal" className="flex-1">
                    Create Command
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {categories.map(category => {
          const categoryCommands = commands.filter(c => c.category === category && c.isEnabled);
          if (categoryCommands.length === 0) return null;

          const config = categoryConfig[category];
          const Icon = config.icon;

          return (
            <div key={category} className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Icon className={`w-5 h-5 ${config.color}`} />
                <h3 className="text-lg font-semibold capitalize">{category}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryCommands.map(cmd => (
                  <Button
                    key={cmd.id}
                    variant="terminal"
                    className="h-auto py-3 px-4 flex items-start gap-3 justify-start"
                    onClick={() => executeCommand(cmd)}
                    disabled={runningCommands.has(cmd.id)}
                  >
                    {runningCommands.has(cmd.id) ? (
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <Play className="w-5 h-5 text-primary shrink-0" />
                    )}
                    <div className="text-left min-w-0">
                      <div className="font-medium truncate">{cmd.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{cmd.command}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Command Log Panel */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Terminal className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Command Log</h3>
        </div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {commandLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No commands executed yet
            </p>
          ) : (
            commandLogs.map(log => (
              <div key={log.id} className="bg-secondary/50 rounded p-3 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  {log.status === 'running' && <Clock className="w-4 h-4 text-info animate-pulse" />}
                  {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-success" />}
                  {log.status === 'failed' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  <span className="font-mono text-xs text-muted-foreground">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <code className="text-xs text-foreground font-mono block truncate">
                  $ {log.command}
                </code>
                {log.output && (
                  <p className={`text-xs mt-1 ${log.status === 'success' ? 'text-success' : 'text-destructive'}`}>
                    {log.output}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
