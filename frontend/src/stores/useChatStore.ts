import { axiosInstance } from "@/lib/axios";
import type { Message, User } from "@/types";
import { create } from "zustand";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

type ActivityUpdate = {
	userId: string;
	activity: string;
};

interface ChatStore {
	users: User[];
	isLoading: boolean;
	error: string | null;
	socket: any;
	isConnected: boolean;
	onlineUsers: Set<string>;
	userActivities: Map<string, string>;
	messages: Message[];
	messageCache: Record<string, Message[]>;
	selectedUser: User | null;

	fetchUsers: () => Promise<void>;
	initSocket: (userId: string) => void;
	disconnectSocket: () => void;
	sendMessage: (receiverId: string, senderId: string, content: string) => Promise<boolean>;
	fetchMessages: (userId: string) => Promise<void>;
	setSelectedUser: (user: User | null) => void;
}

const baseURL =
	import.meta.env.VITE_SOCKET_URL ||
	(import.meta.env.MODE === "development" ? "http://localhost:5001" : "/");

const socket = io(baseURL, {
	autoConnect: false, // only connect if user is authenticated
	withCredentials: true,
});

export const useChatStore = create<ChatStore>((set, get) => ({
	users: [],
	isLoading: false,
	error: null,
	socket: socket,
	isConnected: false,
	onlineUsers: new Set(),
	userActivities: new Map(),
	messages: [],
	messageCache: {},
	selectedUser: null,

	setSelectedUser: (user) =>
		set((state) => ({
			selectedUser: user,
			messages: user ? state.messageCache[user.authUserId] ?? [] : [],
		})),

	fetchUsers: async () => {
		set({ isLoading: true, error: null });
		try {
			const response = await axiosInstance.get("/users");
			const userMap = new Map<string, User>();
			(response.data as User[]).forEach((user) => {
				userMap.set(user.authUserId, user);
			});
			const uniqueUsers = [...userMap.values()];
			set((state) => ({ users: uniqueUsers,
                selectedUser: uniqueUsers.find(u => u.authUserId === state.selectedUser?.authUserId) ?? null,
                messages: uniqueUsers.some(u => u.authUserId === state.selectedUser?.authUserId) ? state.messages : [],
            }));
		} catch (error: any) {
			set({ error: error.response?.data?.message ?? "Unable to load chat" });
		} finally {
			set({ isLoading: false });
		}
	},

	initSocket: () => {
		if (!socket.active) {

			socket.connect();

			socket.on("connect", () => set({ isConnected: true }));
            socket.on("disconnect", () => set({ isConnected: false }));
            socket.on("connect_error", () => set({ isConnected: false, error: "Unable to connect to chat" }));
            socket.on("friends_changed", () => { void get().fetchUsers(); });

			socket.on("users_online", (users: string[]) => {
				set({ onlineUsers: new Set(users) });
			});

			socket.on("activities", (activities: [string, string][]) => {
				set({ userActivities: new Map(activities) });
			});

			socket.on("user_connected", (userId: string) => {
				set((state) => ({
					onlineUsers: new Set([...state.onlineUsers, userId]),
				}));
			});

			socket.on("user_disconnected", (userId: string) => {
				set((state) => {
					const newOnlineUsers = new Set(state.onlineUsers);
					newOnlineUsers.delete(userId);
					return { onlineUsers: newOnlineUsers };
				});
			});

			socket.on("receive_message", (message: Message) => {
				set((state) => {
					const activeUserId = state.selectedUser?.authUserId;
					const otherUserId = message.senderId;
					const cachedMessages = otherUserId ? state.messageCache[otherUserId] ?? [] : [];
					const updatedMessages = [...cachedMessages.filter(m => m._id !== message._id), message];

					return {
						messageCache: otherUserId
							? { ...state.messageCache, [otherUserId]: updatedMessages }
							: state.messageCache,
						messages: otherUserId && activeUserId === otherUserId ? updatedMessages : state.messages,
					};
				});
			});

			socket.on("message_sent", (message: Message) => {
				set((state) => {
					const activeUserId = state.selectedUser?.authUserId;
					const otherUserId = message.receiverId;
					const cachedMessages = otherUserId ? state.messageCache[otherUserId] ?? [] : [];
					const updatedMessages = [...cachedMessages.filter(m => m._id !== message._id), message];

					return {
						messageCache: otherUserId
							? { ...state.messageCache, [otherUserId]: updatedMessages }
							: state.messageCache,
						messages: otherUserId && activeUserId === otherUserId ? updatedMessages : state.messages,
					};
				});
			});

			socket.on("activity_updated", ({ userId, activity }: ActivityUpdate) => {
				set((state) => {
					const newActivities = new Map(state.userActivities);
					newActivities.set(userId, activity);
					return { userActivities: newActivities };
				});
			});

		}
	},

	disconnectSocket: () => {
		{
			socket.disconnect();
			socket.removeAllListeners();
			set({
				isConnected: false,
                users: [], selectedUser: null, error: null,
				onlineUsers: new Set(),
				userActivities: new Map(),
				messages: [],
				messageCache: {},
			});
		}
	},

	sendMessage: async (receiverId, _senderId, content) => {
        if (!socket.connected) { toast.error("Chat is disconnected. Please try again."); return false; }
        return new Promise<boolean>((resolve) => {
            socket.timeout(10000).emit("send_message", { receiverId, content }, (err: Error | null, result: { error?: string }) => {
                if (err || result?.error) { toast.error(result?.error || "Message could not be sent"); resolve(false); }
                else resolve(true);
            });
        });
    },

	fetchMessages: async (userId: string) => {
		const cachedMessages = get().messageCache[userId] ?? [];
		set({ isLoading: true, error: null, messages: cachedMessages });
		try {
			const response = await axiosInstance.get(`/users/messages/${userId}`);
			set((state) => ({
				messages: state.selectedUser?.authUserId === userId ? [...new Map([...response.data, ...(state.messageCache[userId] ?? [])].map((m: Message) => [m._id, m])).values()] : state.messages,
				messageCache: {
					...state.messageCache,
					[userId]: [...new Map([...response.data, ...(state.messageCache[userId] ?? [])].map((m: Message) => [m._id, m])).values()],
				},
			}));
		} catch (error: any) {
			set({ error: error.response?.data?.message ?? "Unable to load chat" });
		} finally {
			set({ isLoading: false });
		}
	},
}));
