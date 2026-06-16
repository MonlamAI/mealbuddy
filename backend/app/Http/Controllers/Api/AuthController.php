<?php

namespace App\Http\Controllers\Api;

use App\Concerns\PasswordValidationRules;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
            'role' => 'nullable|string|in:employee,chef,accountant',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role ?? 'employee',
            'is_active' => true,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

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
        ]);

        $updates = [
            'name' => $request->name,
            'name_bo' => $request->name_bo,
            'nickname' => $request->nickname,
            'nickname_bo' => $request->nickname_bo,
        ];

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
}
