import { authErrorFromCode } from "@/auth/errors";
import { saveSession } from "@/auth/secure-session";
import {
  Alert,
  Button,
  PasswordInput,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { getSupabaseClient, sessionToStored } from "@/supabase/client";
import { passwordResetConfirmSchema } from "@gof/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";

type FormValues = { password: string; confirmPassword: string };

function parseTokensFromUrl(url: string): {
  access_token?: string;
  refresh_token?: string;
} {
  const hash = url.includes("#") ? url.split("#")[1] : "";
  const query = url.includes("?") ? url.split("?")[1]?.split("#")[0] : "";
  const params = new URLSearchParams(hash || query || "");
  return {
    access_token: params.get("access_token") ?? undefined,
    refresh_token: params.get("refresh_token") ?? undefined,
  };
}

export default function ResetScreen() {
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>();
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(passwordResetConfirmSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    let mounted = true;

    async function bootstrapSession() {
      try {
        const supabase = getSupabaseClient();
        let accessToken = params.access_token;
        let refreshToken = params.refresh_token;

        if (!accessToken) {
          const initial = await Linking.getInitialURL();
          if (initial) {
            const parsed = parseTokensFromUrl(initial);
            accessToken = parsed.access_token;
            refreshToken = parsed.refresh_token;
          }
        }

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error || !data.session) {
            if (mounted) {
              setErrorMessage(authErrorFromCode("session_expired").message);
            }
            return;
          }
          await saveSession(sessionToStored(data.session));
        }

        if (mounted) setReady(true);
      } catch {
        if (mounted) {
          setErrorMessage(authErrorFromCode("session_expired").message);
        }
      }
    }

    bootstrapSession();
    return () => {
      mounted = false;
    };
  }, [params.access_token, params.refresh_token]);

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        setErrorMessage(authErrorFromCode("password_update_failed").message);
        return;
      }
      setSuccess(true);
    } catch {
      setErrorMessage(authErrorFromCode("password_update_failed").message);
    }
  });

  if (!ready && !errorMessage) {
    return (
      <SafeAreaScreen>
        <Text variant="body" muted style={styles.center}>
          Preparando redefinição…
        </Text>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="title">Nova senha</Text>
          <Text variant="body" muted style={styles.subtitle}>
            Defina uma senha segura para sua conta.
          </Text>

          {errorMessage ? (
            <Alert title="Erro" message={errorMessage} tone="danger" />
          ) : null}

          {success ? (
            <>
              <Alert title="Senha atualizada" message="Faça login com a nova senha." tone="info" />
              <Button title="Ir para login" onPress={() => router.replace("/(auth)/login")} />
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text variant="caption">Nova senha</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <PasswordInput
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="Mínimo 8 caracteres"
                    />
                  )}
                />
                {errors.password ? (
                  <Text variant="caption" style={styles.error}>
                    {errors.password.message}
                  </Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text variant="caption">Confirmar senha</Text>
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <PasswordInput
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="Repita a senha"
                    />
                  )}
                />
                {errors.confirmPassword ? (
                  <Text variant="caption" style={styles.error}>
                    {errors.confirmPassword.message}
                  </Text>
                ) : null}
              </View>

              <Button title="Salvar senha" loading={isSubmitting} onPress={onSubmit} />
            </>
          )}
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
  center: { padding: 24, textAlign: "center" },
});
