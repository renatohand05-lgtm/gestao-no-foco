import {
  Alert,
  Button,
  Input,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { authErrorFromCode } from "@/auth/errors";
import { getSupabaseClient } from "@/supabase/client";
import { passwordResetRequestSchema } from "@gof/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

type FormValues = { email: string };

export default function RecoverScreen() {
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(values.email.trim(), {
        redirectTo: "gof://auth/reset",
      });
      if (error) {
        setErrorMessage(authErrorFromCode("password_reset_failed").message);
        return;
      }
      setSent(true);
    } catch {
      setErrorMessage(authErrorFromCode("password_reset_failed").message);
    }
  });

  return (
    <SafeAreaScreen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="title">Recuperar senha</Text>
          <Text variant="body" muted style={styles.subtitle}>
            Enviaremos um link para redefinir sua senha.
          </Text>

          {sent ? (
            <Alert
              title="E-mail enviado"
              message="Verifique sua caixa de entrada e siga o link para redefinir a senha."
              tone="info"
            />
          ) : null}

          {errorMessage ? (
            <Alert title="Erro" message={errorMessage} tone="danger" />
          ) : null}

          {!sent ? (
            <>
              <View style={styles.field}>
                <Text variant="caption">E-mail</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="voce@empresa.com"
                    />
                  )}
                />
                {errors.email ? (
                  <Text variant="caption" style={styles.error}>
                    {errors.email.message}
                  </Text>
                ) : null}
              </View>

              <Button title="Enviar link" loading={isSubmitting} onPress={onSubmit} />
            </>
          ) : (
            <Button title="Voltar ao login" onPress={() => router.replace("/(auth)/login")} />
          )}

          <Link href="/(auth)/login" asChild>
            <Text variant="caption" muted style={styles.link}>
              Voltar ao login
            </Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 16 },
  subtitle: { marginBottom: 8 },
  field: { gap: 6 },
  error: { color: "#DC2626" },
  link: { textAlign: "center", marginTop: 8 },
});
