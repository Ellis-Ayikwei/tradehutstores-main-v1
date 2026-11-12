import { useEffect, type ReactNode } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, CreditCard, Globe, Loader2, Save, Undo2 } from 'lucide-react';

import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { PageHeader } from '@/components/shadcn/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Switch } from '@/components/shadcn/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Textarea } from '@/components/shadcn/textarea';
import { toast } from '@/components/shadcn/sonner';

const optionalNumber = (label: string, max?: number) =>
    z
        .string()
        .trim()
        .refine((value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0 && (max === undefined || Number(value) <= max)), {
            message: max === undefined ? `${label} must be a number, 0 or more` : `${label} must be a number between 0 and ${max}`,
        });

const settingsSchema = z.object({
    siteName: z.string().trim().min(1, 'Site name is required'),
    siteDescription: z.string().trim(),
    supportEmail: z.string().trim().refine((value) => value === '' || z.string().email().safeParse(value).success, { message: 'Enter a valid email address' }),
    contactPhone: z.string().trim(),
    defaultLanguage: z.string(),
    timezone: z.string(),
    maintenanceMode: z.boolean(),
    maintenanceMessage: z.string().trim(),

    adminEmailNotifications: z.boolean(),
    sellerEmailNotifications: z.boolean(),
    userEmailNotifications: z.boolean(),
    smsNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    emailServiceProvider: z.string(),
    smtpServer: z.string().trim(),
    smtpPort: z.string().trim(),
    smtpUsername: z.string().trim(),
    smtpPassword: z.string(),
    smsApiKey: z.string(),
    smsFrom: z.string().trim(),

    currencyCode: z.string().trim(),
    currencySymbol: z.string().trim(),
    serviceFeePercentage: optionalNumber('Service fee', 100),
    minimumWithdrawalAmount: optionalNumber('Minimum withdrawal'),
    automaticPayouts: z.boolean(),
    payoutSchedule: z.string(),
});

type SettingsValues = z.infer<typeof settingsSchema>;
type StringKeys = { [K in keyof SettingsValues]: SettingsValues[K] extends string ? K : never }[keyof SettingsValues];
type BooleanKeys = { [K in keyof SettingsValues]: SettingsValues[K] extends boolean ? K : never }[keyof SettingsValues];

const DEFAULT_VALUES: SettingsValues = {
    siteName: 'TradeHut',
    siteDescription: '',
    supportEmail: '',
    contactPhone: '024 813 8722',
    defaultLanguage: 'en',
    timezone: 'UTC',
    maintenanceMode: false,
    maintenanceMessage: 'We are currently performing maintenance. Please check back later.',

    adminEmailNotifications: true,
    sellerEmailNotifications: true,
    userEmailNotifications: true,
    smsNotifications: false,
    pushNotifications: false,
    emailServiceProvider: 'smtp',
    smtpServer: '',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    smsApiKey: '',
    smsFrom: '',

    currencyCode: '',
    currencySymbol: '',
    serviceFeePercentage: '',
    minimumWithdrawalAmount: '',
    automaticPayouts: false,
    payoutSchedule: 'weekly',
};

const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ru', label: 'Russian' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ar', label: 'Arabic' },
];

const TIMEZONES = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
    { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
    { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

const EMAIL_PROVIDERS = [
    { value: 'smtp', label: 'SMTP Server' },
    { value: 'sendgrid', label: 'SendGrid' },
    { value: 'mailchimp', label: 'Mailchimp' },
    { value: 'aws_ses', label: 'AWS SES' },
];

const PAYOUT_SCHEDULES = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
];

interface FieldProps<K> {
    control: Control<SettingsValues>;
    name: K;
    label: string;
    description?: string;
}

function TextField({ control, name, label, description, type = 'text', placeholder, inputMode, autoComplete }: FieldProps<StringKeys> & { type?: string; placeholder?: string; inputMode?: 'text' | 'decimal' | 'numeric' | 'email'; autoComplete?: string }) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Input {...field} type={type} placeholder={placeholder} inputMode={inputMode} autoComplete={autoComplete} />
                    </FormControl>
                    {description ? <FormDescription>{description}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

function TextAreaField({ control, name, label, description, placeholder }: FieldProps<StringKeys> & { placeholder?: string }) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <Textarea {...field} rows={3} placeholder={placeholder} />
                    </FormControl>
                    {description ? <FormDescription>{description}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

function SelectField({ control, name, label, description, options }: FieldProps<StringKeys> & { options: { value: string; label: string }[] }) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {description ? <FormDescription>{description}</FormDescription> : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}

function SwitchField({ control, name, label, description }: FieldProps<BooleanKeys>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-4 space-y-0 border-b py-3 last:border-b-0">
                    <div className="min-w-0 space-y-0.5">
                        <FormLabel>{label}</FormLabel>
                        {description ? <FormDescription>{description}</FormDescription> : null}
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                </FormItem>
            )}
        />
    );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description ? <CardDescription>{description}</CardDescription> : null}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

const FIELD_GRID = 'grid grid-cols-1 gap-4 md:grid-cols-2';

export default function AdminSettings() {
    const form = useForm<SettingsValues>({ resolver: zodResolver(settingsSchema), defaultValues: DEFAULT_VALUES, mode: 'onTouched' });
    const { control, formState, watch } = form;
    const { isDirty, isSubmitting } = formState;

    const maintenanceMode = watch('maintenanceMode');
    const emailProvider = watch('emailServiceProvider');
    const smsEnabled = watch('smsNotifications');

    useEffect(() => {
        if (!isDirty) return;
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const onSubmit = form.handleSubmit(async (values) => {
        try {
            // No settings API exists yet; this mirrors the previous behaviour of simulating the request.
            await new Promise((resolve) => setTimeout(resolve, 1000));
            form.reset(values);
            toast.success('Settings saved for this session. A settings API is not connected yet, so they are not persisted.');
        } catch {
            toast.error('Failed to save settings. Please try again.');
        }
    });

    return (
        <Form {...form}>
            <form onSubmit={onSubmit} noValidate className="space-y-4 pb-20">
                <PageHeader title="System Settings" description="Manage your application configuration and preferences" className="pb-0" />

                <Tabs defaultValue="general">
                    <div className="-mx-1 overflow-x-auto px-1 pb-1">
                        <TabsList className="w-max">
                            <TabsTrigger value="general">
                                <Globe aria-hidden="true" />
                                General
                            </TabsTrigger>
                            <TabsTrigger value="notifications">
                                <Bell aria-hidden="true" />
                                Notifications
                            </TabsTrigger>
                            <TabsTrigger value="payment">
                                <CreditCard aria-hidden="true" />
                                Payment
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="general" className="mt-4 space-y-4">
                        <Section title="Site information" description="Basic information about your application">
                            <div className={FIELD_GRID}>
                                <TextField control={control} name="siteName" label="Site name" placeholder="Your site name" />
                                <TextField control={control} name="siteDescription" label="Site description" placeholder="Brief description of your site" />
                                <TextField control={control} name="supportEmail" label="Support email" type="email" inputMode="email" autoComplete="email" placeholder="Support email address" />
                                <TextField control={control} name="contactPhone" label="Contact phone" type="tel" inputMode="text" autoComplete="tel" placeholder="Support phone number" />
                            </div>
                        </Section>

                        <Section title="Localization">
                            <div className={FIELD_GRID}>
                                <SelectField control={control} name="defaultLanguage" label="Default language" options={LANGUAGES} />
                                <SelectField control={control} name="timezone" label="Default timezone" options={TIMEZONES} />
                            </div>
                        </Section>

                        <Section title="Maintenance">
                            <SwitchField control={control} name="maintenanceMode" label="Maintenance mode" description="Enable to temporarily disable public access to the site" />
                            {maintenanceMode ? (
                                <div className="pt-4">
                                    <TextAreaField control={control} name="maintenanceMessage" label="Maintenance message" placeholder="Message to display during maintenance" />
                                </div>
                            ) : null}
                        </Section>
                    </TabsContent>

                    <TabsContent value="notifications" className="mt-4 space-y-4">
                        <Section title="Email notifications">
                            <SwitchField control={control} name="adminEmailNotifications" label="Admin notifications" description="Send email notifications to administrators" />
                            <SwitchField control={control} name="sellerEmailNotifications" label="Seller notifications" description="Send email notifications to sellers" />
                            <SwitchField control={control} name="userEmailNotifications" label="Customer notifications" description="Send email notifications to customers" />
                        </Section>

                        <Section title="SMS and push notifications">
                            <SwitchField control={control} name="smsNotifications" label="SMS notifications" description="Send SMS notifications for important updates" />
                            <SwitchField control={control} name="pushNotifications" label="Push notifications" description="Send mobile app push notifications" />
                        </Section>

                        <Section title="Email configuration">
                            <div className="space-y-4">
                                <div className={FIELD_GRID}>
                                    <SelectField control={control} name="emailServiceProvider" label="Email service provider" options={EMAIL_PROVIDERS} />
                                </div>
                                {emailProvider === 'smtp' ? (
                                    <div className={FIELD_GRID}>
                                        <TextField control={control} name="smtpServer" label="SMTP server" placeholder="SMTP server host" />
                                        <TextField control={control} name="smtpPort" label="SMTP port" inputMode="numeric" placeholder="587" />
                                        <TextField control={control} name="smtpUsername" label="SMTP username" autoComplete="off" placeholder="SMTP username" />
                                        <TextField control={control} name="smtpPassword" label="SMTP password" type="password" autoComplete="new-password" />
                                    </div>
                                ) : (
                                    <div className={FIELD_GRID}>
                                        <TextField control={control} name="smtpPassword" label="API key" type="password" autoComplete="new-password" />
                                    </div>
                                )}
                            </div>
                        </Section>

                        {smsEnabled ? (
                            <Section title="SMS configuration">
                                <div className={FIELD_GRID}>
                                    <TextField control={control} name="smsApiKey" label="SMS API key" type="password" autoComplete="new-password" />
                                    <TextField control={control} name="smsFrom" label="SMS sender name or number" />
                                </div>
                            </Section>
                        ) : null}
                    </TabsContent>

                    <TabsContent value="payment" className="mt-4 space-y-4">
                        <Section title="Currency and fees">
                            <div className={FIELD_GRID}>
                                <TextField control={control} name="currencyCode" label="Currency code" />
                                <TextField control={control} name="currencySymbol" label="Currency symbol" />
                                <TextField control={control} name="serviceFeePercentage" label="Service fee (%)" type="number" inputMode="decimal" />
                                <TextField control={control} name="minimumWithdrawalAmount" label="Minimum withdrawal amount" type="number" inputMode="decimal" />
                            </div>
                        </Section>

                        <Section title="Payouts">
                            <SwitchField control={control} name="automaticPayouts" label="Automatic payouts" description="Automatically process payouts to sellers" />
                            <div className="pt-4">
                                <div className={FIELD_GRID}>
                                    <SelectField control={control} name="payoutSchedule" label="Payout schedule" options={PAYOUT_SCHEDULES} />
                                </div>
                            </div>
                        </Section>
                    </TabsContent>
                </Tabs>

                <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 border-t bg-background px-1 py-3">
                    <p className="text-sm text-muted-foreground">{isDirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => form.reset()}>
                            <Undo2 aria-hidden="true" />
                            Discard
                        </Button>
                        <Button type="submit" disabled={!isDirty || isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
                            {isSubmitting ? 'Saving...' : 'Save changes'}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}
