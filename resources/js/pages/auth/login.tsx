import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    return (
        <AuthLayout
            title="Bem-vindo(a) de volta"
            description="Digite seu e-mail e senha para acessar o sistema"
        >
            <Head title="Login - Phisio" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="mt-2 flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="seu@email.com"
                                    className="border-neutral-200 bg-neutral-50 focus:border-primary focus:ring-primary/20"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Senha</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm text-primary hover:text-primary/80"
                                            tabIndex={5}
                                        >
                                            Esqueceu a senha?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="border-neutral-200 bg-neutral-50 focus:border-primary focus:ring-primary/20"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                />
                                <Label
                                    htmlFor="remember"
                                    className="font-normal"
                                >
                                    Lembrar de mim
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 w-full bg-primary text-white shadow-sm hover:bg-primary/90"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner className="mr-2" />}
                                Entrar no Sistema
                            </Button>

                            {canRegister && (
                                <p className="text-center text-sm text-muted-foreground">
                                    Ainda não tem conta?{' '}
                                    <TextLink
                                        href="/register"
                                        className="font-medium text-primary hover:text-primary/80"
                                        tabIndex={6}
                                    >
                                        Teste grátis por 15 dias
                                    </TextLink>
                                </p>
                            )}
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="mt-4 mb-4 rounded-lg border border-emerald-100 bg-emerald-50 py-2 text-center text-sm font-medium text-emerald-600">
                    {status}
                </div>
            )}
        </AuthLayout>
    );
}
