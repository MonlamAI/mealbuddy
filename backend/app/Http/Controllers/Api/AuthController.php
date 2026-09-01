<?php

namespace App\Http\Controllers\Api;

use App\Concerns\PasswordValidationRules;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    use PasswordValidationRules;

    public function register(Request $request)
    {
        $passwordRules = $this->passwordRules();
        // Remove 'confirmed' if it's not provided in the request
        if (! $request->has('password_confirmation')) {
            $passwordRules = array_filter($passwordRules, fn ($rule) => $rule !== 'confirmed');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => $passwordRules,
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'employee',
            'is_active' => true,
        ]);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->json([
            'user' => $user,
        ]);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (Auth::guard('web')->attempt($credentials)) {
            $request->session()->regenerate();

            return response()->json([
                'user' => Auth::guard('web')->user(),
            ]);
        }

        throw ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Successfully logged out',
        ]);
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'required|string|max:255',
            'name_bo' => 'nullable|string|max:255',
            'nickname' => 'nullable|string|max:255',
            'nickname_bo' => 'nullable|string|max:255',
            'avatar' => 'nullable|image|mimes:jpeg,jpg,png,webp|max:5120',
            'dietary_preference' => 'nullable|in:veg,non-veg',
        ]);

        $updates = [
            'name' => $request->name,
            'name_bo' => $request->name_bo,
            'nickname' => $request->nickname,
            'nickname_bo' => $request->nickname_bo,
        ];

        if ($request->has('dietary_preference')) {
            $updates['dietary_preference'] = $request->dietary_preference;
        }

        if ($request->hasFile('avatar')) {
            $oldAvatar = $user->avatar;
            if ($oldAvatar && ! str_starts_with($oldAvatar, 'http') && ! str_starts_with($oldAvatar, 'data:')) {
                Storage::disk('public')->delete($oldAvatar);
            }

            $updates['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $user->update($updates);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->fresh(),
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $status = Password::broker()->sendResetLink(
            $request->only('email')
        );

        return $status === Password::RESET_LINK_SENT
                    ? response()->json(['message' => __($status)])
                    : response()->json(['message' => __($status)], 400);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->setRememberToken(\Illuminate\Support\Str::random(60));

                $user->save();
            }
        );

        return $status === Password::PASSWORD_RESET
                    ? response()->json(['message' => __($status)])
                    : response()->json(['message' => __($status)], 400);
    }
}
