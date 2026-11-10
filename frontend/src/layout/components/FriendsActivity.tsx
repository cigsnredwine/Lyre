import { useNavigate } from "react-router-dom";
import FriendManager from "@/components/ui/FriendManager";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { HeadphonesIcon, Music, Users } from "lucide-react";

const parseActivity = (activity: string | undefined) => {
	if (!activity || activity === "Idle") {
		return { isPlaying: false, title: "", artist: "" };
	}

	const prefix = "Playing: ";
	if (activity.startsWith(prefix)) {
		const details = activity.slice(prefix.length);
		const [title, ...artistParts] = details.split(" - ");

		return {
			isPlaying: true,
			title: title ?? "",
			artist: artistParts.join(" - "),
		};
	}

	return {
		isPlaying: true,
		title: activity,
		artist: "",
	};
};

const FriendsActivity = () => {
    const navigate = useNavigate();
	const { users, onlineUsers, userActivities, setSelectedUser } = useChatStore();
    const { isAuthenticated } = useAuthStore();

	const uniqueUsers = Array.from(new Map(users.map((user) => [user.authUserId, user])).values());

	return (
		<div className='friends-panel flex h-full flex-col rounded-xl border border-white/8 bg-black/34 backdrop-blur-[6px] shadow-[0_14px_36px_rgba(0,0,0,0.14)]'>
			<div className='flex items-center justify-between border-b border-white/8 p-4'>
				<div className='flex items-center gap-2'>
					<Users className='size-5 shrink-0' />
					<h2 className='font-semibold'>What they're listening to</h2>
				</div>
				{isAuthenticated && <FriendManager />}
			</div>

			{!isAuthenticated && <LoginPrompt />}

			<ScrollArea className='flex-1'>
				<div className='p-4 space-y-4'>
					{isAuthenticated && !uniqueUsers.length && <p className="text-sm text-zinc-400">Add friends to see what they’re listening to.</p>}
					{uniqueUsers.map((user) => {
						const activity = parseActivity(userActivities.get(user.authUserId));

						return (
							<button type="button" aria-label={`Chat with ${user.fullName}`} onClick={() => { setSelectedUser(user); navigate("/chat"); }}
								key={user._id}
								className='group w-full text-left cursor-pointer rounded-md p-3 transition-colors hover:bg-white/6'
							>
								<div className='flex items-start gap-3'>
									<div className='relative'>
										<Avatar className='size-10 border border-zinc-800'>
											<AvatarImage src={user.imageUrl} alt={user.fullName} />
											<AvatarFallback>{user.fullName[0]}</AvatarFallback>
										</Avatar>
										<div
											className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-900 
												${onlineUsers.has(user.authUserId) ? "bg-green-500" : "bg-zinc-500"}
												`}
											aria-hidden='true'
										/>
									</div>

									<div className='flex-1 min-w-0'>
										<div className='flex items-center gap-2'>
											<span className='font-medium text-sm text-white'>{user.fullName}</span>
											{activity.isPlaying && <Music className='size-3.5 text-primary shrink-0' />}
										</div>

										{activity.isPlaying ? (
											<div className='mt-1'>
												<div className='mt-1 text-sm text-white font-medium truncate'>
													{activity.title}
												</div>
												<div className='text-xs text-zinc-400 truncate'>
													{activity.artist ? `by ${activity.artist}` : ""}
												</div>
											</div>
										) : (
											<div className='mt-1 text-xs text-zinc-400'>Idle</div>
										)}
									</div>
								</div>
							</button>
						);
					})}
				</div>
			</ScrollArea>
		</div>
	);
};
export default FriendsActivity;

const LoginPrompt = () => (
	<div className='h-full flex flex-col items-center justify-center p-6 text-center space-y-4'>
		<div className='relative'>
			<div
				className='absolute -inset-1 rounded-full bg-primary/35 blur-lg
       opacity-75 animate-pulse'
				aria-hidden='true'
			/>
			<div className='relative bg-zinc-900 rounded-full p-4'>
				<HeadphonesIcon className='size-8 text-primary' />
			</div>
		</div>

		<div className='space-y-2 max-w-[250px]'>
			<h3 className='text-lg font-semibold text-white'>See What Friends Are Playing</h3>
			<p className='text-sm text-zinc-400'>Login to discover what music your friends are enjoying right now</p>
		</div>
	</div>
);
