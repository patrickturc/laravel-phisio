import { Form, Head } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';

type Props = {
    trialDays: number;
};

export default function Register({ trialDays = 15 }: Props) {
    return (
        <AuthLayout
            title="Crie a conta da sua clínica"
            description={`Teste todos os recursos por ${trialDays} dias. Sem cartão de crédito.`}
        >
            <Head title="Criar conta - Phisio" />

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {['Acesso completo', 'Sem cartão', 'Cancele quando quiser'].map(
                    (item) => (
                        <span key={item} className="flex items-center gap-1">
                            <CheckCircle2 className="size-3.5 text-secondary-foreground" />
                            {item}
                        </span>
                    ),
                )}
            </div>

            <Form
                action="/register"
                method="post"
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="mt-4 flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <div className="grid gap-5">
                        <div className="grid gap-2">
                            <Label htmlFor="organization_name">
                                Nome da clínica ou estúdio
                            </Label>
                            <Input
                                id="organization_name"
                                name="organization_name"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="organization"
                                placeholder="Studio Movimento"
                                className="border-neutral-200 bg-neutral-50 focus:border-primary focus:ring-primary/20"
                            />
                            <InputError message={errors.organization_name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="document">
                                CNPJ da clínica ou seu CPF
                            </Label>
                            <Input
                                id="document"
                                name="document"
                                required
                                tabIndex={2}
                                inputMode="numeric"
                                placeholder="00.000.000/0000-00"
                                className="border-neutral-200 bg-neutral-50 focus:border-primary focus:ring-primary/20"
                            />
                            <InputError message={errors.document} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="name">Seu nome</Label>
                            <Input
                                id="name"
                                name="name"
                                required
                                tabIndex={3}
                                autoComplete="name"
                                placeholder="Maria Oliveira"
                                className="border-neutral-200 bg-neutral-50 focus:border-primary focus:ring-primary/20"
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                tabIndex={4}
                                autoComplete="email"
                                placeholder="seu@email.com"
                                className="border-neutral-200 bg-neutral-50 focus:border-primary focus:ring-primary/20"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">Telefone com DDD</Label>
                            <Input
                                id="phone"
                                name="phone"
                                required
                                tabIndex={5}
                                autoComplete="tel"
                                inputMode="tel"
                                placeholder="(11) 99999-0000"
                                className="border-neutral-200 bg-neutral-50 focus:border-primary focus:ring-primary/20"
                            />
                            <InputError message={errors.phone} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Senha</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                tabIndex={6}
                                autoComplete="new-password"
                                placeholder="••••••••"
                                className="border-neutral-200 bg-neutral-50 focus:border-primary focus:ring-primary/20"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                Confirme a senha
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                required
                                tabIndex={7}
                                autoComplete="new-password"
                                placeholder="••••••••"
                                className="border-neutral-200 bg-neutral-50 focus:border-primary focus:ring-primary/20"
                            />
                            <InputError
                                message={errors.password_confirmation}
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="terms"
                                    name="terms"
                                    value="1"
                                    tabIndex={8}
                                    className="mt-0.5 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                />
                                <Label
                                    htmlFor="terms"
                                    className="text-sm leading-relaxed font-normal"
                                >
                                    Li e aceito os termos de uso e a política de
                                    privacidade.
                                </Label>
                            </div>
                            <InputError message={errors.terms} />
                        </div>

                        <Button
                            type="submit"
                            className="mt-2 w-full bg-primary text-white shadow-sm hover:bg-primary/90"
                            tabIndex={9}
                            disabled={processing}
                            data-test="register-button"
                        >
                            {processing && <Spinner className="mr-2" />}
                            Começar teste de {trialDays} dias
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Já tem uma conta?{' '}
                            <TextLink
                                href={login()}
                                className="text-primary hover:text-primary/80"
                            >
                                Entrar
                            </TextLink>
                        </p>
                    </div>
                )}
            </Form>
        </AuthLayout>
    );
}
