import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Camera, Loader2 } from "lucide-react";
import Topbar from "@/components/ui/Topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { axiosInstance } from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import { useAuthStore } from "@/stores/useAuthStore";

const ProfilePage = () => {
	const { currentUser, sessionUser, isAuthenticated, hasCheckedAdmin, checkAdminStatus, setAuthState } = useAuthStore();
	const [name, setName] = useState("");
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [isSavingPassword, setIsSavingPassword] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!hasCheckedAdmin) {
			checkAdminStatus();
		}
	}, [checkAdminStatus, hasCheckedAdmin]);

	useEffect(() => {
		if (currentUser) {
			setName(currentUser.fullName);
			setPreviewUrl(currentUser.imageUrl);
		}
	}, [currentUser]);

	if (hasCheckedAdmin && !isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] ?? null;
		setImageFile(file);

		if (file) {
			setPreviewUrl(URL.createObjectURL(file));
		}
	};

	const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsSavingProfile(true);

		try {
			const formData = new FormData();
			formData.append("name", name.trim());

			if (imageFile) {
				formData.append("imageFile", imageFile);
			}

			const response = await axiosInstance.patch("/app-auth/profile", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			setAuthState({
				user: response.data.user,
				sessionUser: response.data.sessionUser,
				isAdmin: response.data.isAdmin,
			});
			setImageFile(null);
			toast.success("Profile updated");
		} catch (error: any) {
			toast.error(error.response?.data?.message ?? "Failed to update profile");
		} finally {
			setIsSavingProfile(false);
		}
	};

	const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (newPassword !== confirmPassword) {
			toast.error("New passwords do not match");
			return;
		}

		setIsSavingPassword(true);

		try {
			const response = await authClient.changePassword({
				currentPassword,
				newPassword,
				revokeOtherSessions: false,
			});

			if (response.error) {
				throw new Error(response.error.message || "Failed to change password");
			}

			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			toast.success("Password changed");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to change password");
		} finally {
			setIsSavingPassword(false);
		}
	};

	return (
		<main className='account-page flex min-h-dvh flex-col overflow-hidden'>
			<Topbar />

			<div className='flex-1 overflow-y-auto'>
				<div className='mx-auto max-w-4xl p-6 space-y-6'>
					<div className='flex items-center justify-between gap-4'>
						<div>
							<h1 className='text-2xl font-medium tracking-tight text-white'>Your Profile</h1>
							<p className='text-zinc-400 mt-1'>Update your display name, profile image, and password.</p>
						</div>
						<Link to='/' className='text-sm text-primary hover:underline'>
							Back home
						</Link>
					</div>

					<Card className='bg-zinc-900 border-zinc-800 text-white'>
						<CardHeader>
							<CardTitle>Profile Details</CardTitle>
							<CardDescription>
								This is what other users will see in chat and activity.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form className='space-y-6' onSubmit={handleProfileSubmit}>
								<div className='flex flex-col sm:flex-row gap-6 items-start'>
									<div className='relative'>
										<Avatar className='size-28 border border-zinc-700'>
											<AvatarImage src={previewUrl || currentUser?.imageUrl} alt={currentUser?.fullName} />
											<AvatarFallback>{currentUser?.fullName?.[0] ?? "U"}</AvatarFallback>
										</Avatar>
										<Button
											type='button'
											size='icon'
											className='absolute bottom-0 right-0 rounded-full'
											onClick={() => fileInputRef.current?.click()}
										>
											<Camera className='size-4' />
										</Button>
										<input
											ref={fileInputRef}
											type='file'
											accept='image/*'
											className='hidden'
											onChange={handleFileSelect}
										/>
									</div>

									<div className='flex-1 space-y-4 w-full'>
										<div className='space-y-2'>
											<label className='text-sm font-medium'>Display Name</label>
											<Input
												value={name}
												onChange={(event) => setName(event.target.value)}
												className='bg-zinc-800 border-zinc-700'
												placeholder='Your display name'
											/>
										</div>

										<div className='space-y-2'>
											<label className='text-sm font-medium'>Email</label>
											<Input
												value={sessionUser?.email ?? ""}
												readOnly
												className='bg-zinc-800 border-zinc-700 text-zinc-400'
											/>
										</div>
									</div>
								</div>

								<Button type='submit' disabled={isSavingProfile || !name.trim()}>
									{isSavingProfile ? <Loader2 className='size-4 animate-spin' /> : "Save Profile"}
								</Button>
							</form>
						</CardContent>
					</Card>

					<Card className='bg-zinc-900 border-zinc-800 text-white'>
						<CardHeader>
							<CardTitle>Change Password</CardTitle>
							<CardDescription>
								Update your password while keeping your current account and session.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form className='space-y-4' onSubmit={handlePasswordSubmit}>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>Current Password</label>
									<Input
										type='password'
										value={currentPassword}
										onChange={(event) => setCurrentPassword(event.target.value)}
										className='bg-zinc-800 border-zinc-700'
									/>
								</div>

								<div className='grid gap-4 sm:grid-cols-2'>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>New Password</label>
										<Input
											type='password'
											value={newPassword}
											onChange={(event) => setNewPassword(event.target.value)}
											className='bg-zinc-800 border-zinc-700'
										/>
									</div>

									<div className='space-y-2'>
										<label className='text-sm font-medium'>Confirm New Password</label>
										<Input
											type='password'
											value={confirmPassword}
											onChange={(event) => setConfirmPassword(event.target.value)}
											className='bg-zinc-800 border-zinc-700'
										/>
									</div>
								</div>

								<Button
									type='submit'
									variant='outline'
									disabled={
										isSavingPassword ||
										!currentPassword ||
										!newPassword ||
										!confirmPassword
									}
								>
									{isSavingPassword ? <Loader2 className='size-4 animate-spin' /> : "Update Password"}
								</Button>
							</form>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
};

export default ProfilePage;
