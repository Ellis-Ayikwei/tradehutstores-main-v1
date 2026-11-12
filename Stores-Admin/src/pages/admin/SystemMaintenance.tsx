import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Cog, Database, FileText, Info, Loader2, PauseCircle, PlayCircle, Power, Save, Server, ShieldAlert } from 'lucide-react';

import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { PageHeader } from '@/components/shadcn/page-header';
import { Switch } from '@/components/shadcn/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Textarea } from '@/components/shadcn/textarea';
import { toast } from '@/components/shadcn/sonner';

const SERVICES = [
    { id: 'api', name: 'API server', description: 'The main API server handling requests from web and mobile clients.' },
    { id: 'database', name: 'Database', description: 'Primary database storing application data.' },
    { id: 'storage', name: 'File storage', description: 'Cloud storage service for user-uploaded files and images.' },
    { id: 'queue', name: 'Message queue', description: 'Service handling asynchronous tasks and message processing.' },
    { id: 'search', name: 'Search index', description: 'Service powering search functionality across the platform.' },
];

const BACKUP_ACTIONS = [
    { id: 'full', label: 'Create full backup', icon: Database },
    { id: 'partial', label: 'Create partial backup', icon: Database },
    { id: 'config', label: 'Backup configuration', icon: Cog },
];

const maintenanceSchema = z
    .object({
        scheduledStartTime: z.string(),
        scheduledEndTime: z.string(),
        message: z.string().trim().min(1, 'Enter the message users will see'),
        allowAdminAccess: z.boolean(),
    })
    .refine((values) => !values.scheduledStartTime || !values.scheduledEndTime || values.scheduledEndTime > values.scheduledStartTime, {
        path: ['scheduledEndTime'],
        message: 'End time must be after the start time',
    });

type MaintenanceValues = z.infer<typeof maintenanceSchema>;

const DEFAULT_VALUES: MaintenanceValues = {
    scheduledStartTime: '',
    scheduledEndTime: '',
    message: 'The system is currently undergoing scheduled maintenance. Please check back later.',
    allowAdminAccess: true,
};

function NotConnectedNotice({ children }: { children: string }) {
    return (
        <div role="note" className="flex items-start gap-2.5 rounded-lg border border-info-subtle bg-info-subtle p-3 text-sm text-info-subtle-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{children}</p>
        </div>
    );
}

function StatusTab() {
    return (
        <div className="space-y-4">
            <NotConnectedNotice>Live service monitoring is not connected yet, so no status can be reported for these services.</NotConnectedNotice>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {SERVICES.map((service) => (
                    <Card key={service.id}>
                        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                            <CardTitle>{service.name}</CardTitle>
                            <Badge variant="secondary">Unknown</Badge>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function MaintenanceTab() {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const form = useForm<MaintenanceValues>({ resolver: zodResolver(maintenanceSchema), defaultValues: DEFAULT_VALUES });
    const { isSubmitting } = form.formState;

    const confirmToggle = () => {
        const next = !maintenanceMode;
        setMaintenanceMode(next);
        setConfirmOpen(false);
        toast.success(next ? 'Maintenance mode enabled for this session' : 'Maintenance mode disabled for this session');
    };

    const onSubmit = form.handleSubmit(async (values) => {
        // No maintenance API exists yet; the previous behaviour only simulated the request.
        await new Promise((resolve) => setTimeout(resolve, 500));
        form.reset(values);
        toast.success('Maintenance settings saved for this session');
    });

    return (
        <div className="space-y-4">
            <NotConnectedNotice>The maintenance API is not connected yet. Changes made here apply to this page only and are not saved to the platform.</NotConnectedNotice>

            <Card>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex min-w-0 items-start gap-3">
                        {maintenanceMode ? <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" /> : <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-success-600" aria-hidden="true" />}
                        <div className="min-w-0">
                            <p className="text-base font-semibold text-foreground">Maintenance mode is {maintenanceMode ? 'enabled' : 'disabled'}</p>
                            <p className="text-sm text-muted-foreground">
                                {maintenanceMode ? 'The system is in maintenance mode. Only administrators can access the platform.' : 'The system is operating normally and is accessible to all users.'}
                            </p>
                        </div>
                    </div>
                    <Button type="button" variant={maintenanceMode ? 'outline' : 'destructive'} onClick={() => setConfirmOpen(true)} className="w-full sm:w-auto">
                        {maintenanceMode ? <Power aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
                        {maintenanceMode ? 'Disable maintenance mode' : 'Enable maintenance mode'}
                    </Button>
                </CardContent>
            </Card>

            <Form {...form}>
                <form onSubmit={onSubmit} noValidate>
                    <Card>
                        <CardHeader>
                            <CardTitle>Maintenance settings</CardTitle>
                            <CardDescription>Schedule a window and set the message shown to users.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="scheduledStartTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Scheduled start time</FormLabel>
                                            <FormControl>
                                                <Input type="datetime-local" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="scheduledEndTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estimated end time</FormLabel>
                                            <FormControl>
                                                <Input type="datetime-local" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Maintenance message (shown to users)</FormLabel>
                                        <FormControl>
                                            <Textarea rows={4} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="allowAdminAccess"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 rounded-lg border p-3">
                                        <div className="min-w-0 space-y-0.5">
                                            <FormLabel>Allow administrator access</FormLabel>
                                            <FormDescription>Administrators can still sign in and use the system during maintenance.</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                                    {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
                                    {isSubmitting ? 'Saving...' : 'Save settings'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </Form>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{maintenanceMode ? 'Disable maintenance mode?' : 'Enable maintenance mode?'}</DialogTitle>
                        <DialogDescription>
                            {maintenanceMode ? 'This will make the system accessible to all users again.' : 'This will make the system inaccessible to regular users. Only administrators will be able to sign in.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" variant={maintenanceMode ? 'default' : 'destructive'} onClick={confirmToggle}>
                            {maintenanceMode ? 'Disable' : 'Enable'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function LogsTab() {
    return (
        <Card>
            <EmptyState icon={FileText} title="No maintenance logs" description="Maintenance windows, updates and clean-ups will be listed here once a maintenance log source is connected." />
        </Card>
    );
}

function BackupsTab() {
    return (
        <div className="space-y-4">
            <NotConnectedNotice>The backup API is not connected yet, so backups cannot be created or listed from here.</NotConnectedNotice>
            <div className="flex flex-wrap gap-2">
                {BACKUP_ACTIONS.map((action) => (
                    <Button key={action.id} type="button" variant="outline" disabled className="w-full sm:w-auto">
                        <action.icon aria-hidden="true" />
                        {action.label}
                    </Button>
                ))}
            </div>
            <Card>
                <EmptyState icon={Database} title="No backups" description="Completed backups will appear here with their size, type and download link." />
            </Card>
        </div>
    );
}

export default function SystemMaintenance() {
    return (
        <div className="space-y-4">
            <PageHeader title="System Maintenance" description="Service status, maintenance mode, logs and backups." className="pb-0" />

            <Tabs defaultValue="status">
                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                    <TabsList className="w-max">
                        <TabsTrigger value="status">
                            <Server aria-hidden="true" />
                            System status
                        </TabsTrigger>
                        <TabsTrigger value="maintenance">
                            <Cog aria-hidden="true" />
                            Maintenance mode
                        </TabsTrigger>
                        <TabsTrigger value="logs">
                            <FileText aria-hidden="true" />
                            Logs
                        </TabsTrigger>
                        <TabsTrigger value="backups">
                            <Database aria-hidden="true" />
                            Backups
                        </TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="status" className="mt-4">
                    <StatusTab />
                </TabsContent>
                <TabsContent value="maintenance" forceMount className="mt-4 data-[state=inactive]:hidden">
                    <MaintenanceTab />
                </TabsContent>
                <TabsContent value="logs" className="mt-4">
                    <LogsTab />
                </TabsContent>
                <TabsContent value="backups" className="mt-4">
                    <BackupsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
