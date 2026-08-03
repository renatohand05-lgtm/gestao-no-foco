import { useSessionStore } from "@/auth/session-store";
import {
  Alert,
  Button,
  Input,
  PasswordInput,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { loginCredentialsSchema } from "@gof/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

type FormValues = { email: string; password: string };

export default function LoginScreen() {
  const login = useSessionStore((s) => s.login);
  const errorMessage = useSessionStore((s) => s.errorMessage);
  const [showPassword, setShowPassword] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(loginCredentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const ok = await login(values.email, values.password);
    if (ok) router.replace("/(auth)/biometric-setup");
  });

  return (
    <SafeAreaScreen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="display">Gestão no Foco</Text>
          <Text variant="body" muted style={styles.subtitle}>
            Entre com seu e-mail e senha corporativos.
          </Text>

          {errorMessage ? (
            <Alert title="Erro" message={errorMessage} tone="danger" style={styles.alert} />
          ) : null}

          <View style={styles.field}>
            <Text variant="caption">E-mail</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
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

          <View style={styles.field}>
            <Text variant="caption">Senha</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <PasswordInput
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                />
              )}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)}>
              <Text variant="caption" muted style={styles.toggle}>
                {showPassword ? "Ocultar senha" : "Mostrar senha"}
              </Text>
            </Pressable>
            {errors.password ? (
              <Text variant="caption" style={styles.error}>
                {errors.password.message}
              </Text>
            ) : null}
          </View>

          <Button title="Entrar" loading={isSubmitting} onPress={onSubmit} />

          <Link href="/(auth)/recover" asChild>
            <Text variant="caption" muted style={styles.link}>
              Esqueci minha senha
            </Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 16 },
  subtitle: { marginTop: 8, marginBottom: 8 },
  field: { gap: 6 },
  error: { color: "#DC2626" },
  alert: { marginBottom: 8 },
  link: { textAlign: "center", marginTop: 16 },
  toggle: { marginTop: 4 },
});
