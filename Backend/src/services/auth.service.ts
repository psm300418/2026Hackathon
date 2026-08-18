import { z } from "zod";
import { createSupabaseAdminClient } from "../config/supabase.js";
import { ApiError } from "../types/http.js";

const signupInputSchema = z.object({
  email: z.string().trim().email("올바른 이메일을 입력해주세요."),
  password: z.string().min(6, "비밀번호는 6자 이상 입력해주세요.").max(72)
});

export const parseSignupInput = (body: unknown) => signupInputSchema.parse(body);

export const signupWithEmailPassword = async (input: z.infer<typeof signupInputSchema>) => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true
  });

  if (error) {
    const alreadyRegistered = error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered");

    if (alreadyRegistered) {
      return {
        created: false,
        message: "이미 가입된 이메일입니다. 로그인으로 계속 진행해주세요."
      };
    }

    throw new ApiError(400, "BAD_REQUEST", error.message);
  }

  return {
    created: true,
    userId: data.user.id,
    message: "회원가입이 완료되었습니다."
  };
};
