"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope } from "lucide-react";

const clinicTypes = [
  { value: "CLINIC", label: "診療所" },
  { value: "HOSPITAL", label: "病院" },
  { value: "DENTAL", label: "歯科" },
  { value: "PHARMACY", label: "薬局" },
  { value: "NURSING_HOME", label: "介護施設" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    organizationName: "",
    clinicType: "",
    prefecture: "",
    city: "",
    address: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    if (form.password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: form.organizationName,
          clinicType: form.clinicType,
          prefecture: form.prefecture,
          city: form.city,
          address: form.address,
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登録中にエラーが発生しました");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("登録中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FBFC] py-8">
      <Card className="w-full max-w-lg border-[#B9D7EA]">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 bg-[#769FCD] rounded-xl flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-[#2C3E50]">新規登録</CardTitle>
          <CardDescription className="text-[#7F8C9B]">
            医療機関と管理者アカウントを作成
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#2C3E50]">医療機関情報</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">医療機関名 *</Label>
              <Input
                id="organizationName"
                placeholder="例: さくら歯科クリニック"
                value={form.organizationName}
                onChange={(e) => handleChange("organizationName", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicType">医療機関タイプ *</Label>
              <Select value={form.clinicType} onValueChange={(v) => handleChange("clinicType", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {clinicTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prefecture">都道府県 *</Label>
                <Input
                  id="prefecture"
                  placeholder="例: 東京都"
                  value={form.prefecture}
                  onChange={(e) => handleChange("prefecture", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">市区町村 *</Label>
                <Input
                  id="city"
                  placeholder="例: 渋谷区"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">住所 *</Label>
              <Input
                id="address"
                placeholder="例: 東京都渋谷区神南1-2-3"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                required
              />
            </div>

            <div className="border-t border-[#B9D7EA] pt-4 mt-4 space-y-1">
              <h3 className="text-sm font-semibold text-[#2C3E50]">管理者アカウント</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">氏名 *</Label>
              <Input
                id="name"
                placeholder="例: 山田太郎"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス *</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@clinic.jp"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="password">パスワード *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="8文字以上"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">パスワード確認 *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="もう一度入力"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#769FCD] hover:bg-[#4A7FB5] text-white"
              disabled={loading}
            >
              {loading ? "登録中..." : "登録する"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-[#7F8C9B]">
            すでにアカウントをお持ちの方は{" "}
            <Link href="/login" className="text-[#769FCD] hover:text-[#4A7FB5] font-medium">
              ログイン
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
