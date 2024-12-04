"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { LoaderCircle, Plus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { set, z } from "zod";
import { Toaster, toast } from "sonner";

const projectId =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1].split(".")[0];

async function getViewedUser({ username }: { username: string }) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("UserProfile")
    .select("user_id, display_name, username, profile_picture_url")
    .eq("username", username)
    .single();

  if (error) {
    console.error("Error retrieving user details:", error);
  }

  return data;
}

async function getAuthenticatedUser() {
  const supabase = createClient();
  const { data: authUser, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("Error getting authenticated user:", authError);
  }
  return authUser?.user;
}

async function getFriends({ userId }: { userId: string }) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("Friends")
    .select("user_id1, user_id2")
    .or(`user_id1.eq.${userId},user_id2.eq.${userId}`)
    .eq("accepted", true);

  if (error) {
    console.error("Error retrieving friends:", error);
    return [];
  }

  // Map the result to extract the friend IDs
  const friends: string[] = [];
  for (const row of data) {
    if (row.user_id1 === userId && row.user_id2) {
      friends.push(row.user_id2);
    } else if (row.user_id2 === userId && row.user_id1) {
      friends.push(row.user_id1);
    }
  }

  return friends;
}

async function getFriendRequests({ userId }: { userId: string }) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("Friends")
    .select("user_id1")
    .eq("user_id2", userId)
    .eq("accepted", false);

  if (error) {
    console.error("Error retrieving friends requests:", error);
    return [];
  }

  // Map the result to extract the friend IDs
  const friends: string[] = [];
  for (const row of data) {
    if (row.user_id1) {
      friends.push(row.user_id1);
    }
  }
  return friends;
}

async function getUserDetails(userIds: string[]) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("UserProfile")
    .select("user_id, display_name, username, profile_picture_url")
    .in("user_id", userIds);

  if (error) {
    console.log("Error fetching user details:", error);
    return [];
  }

  return data;
}

async function handleAcceptRequest(friendId: string) {
  const supabase = createClient();
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    console.error("No authenticated user found");
    return;
  }
  const data = await supabase
    .from("Friends")
    .update({ accepted: true })
    .eq("user_id1", friendId)
    .eq("user_id2", authUser.id)
    .select();
  window.location.reload();
}

async function handleDeleteFriend(friendId: string) {
  const supabase = createClient();
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    console.error("No authenticated user found");
    return;
  }

  await supabase
    .from("Friends")
    .delete()
    .eq("user_id1", authUser.id)
    .eq("user_id2", friendId);

  await supabase
    .from("Friends")
    .delete()
    .eq("user_id1", friendId)
    .eq("user_id2", authUser.id);

  window.location.reload();
}

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

export default function FriendsList({ username }: { username: string }) {
  const [toastMessage, setToastMessage] = useState("");

  async function addFriend(friend: z.infer<typeof formSchema>) {
    const supabase = createClient();
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      console.log("No authenticated user found");
      return;
    }

    // Find the user ID for the target friend (username)
    const { data, error } = await supabase
      .from("UserProfile")
      .select("user_id")
      .eq("username", friend.username)
      .single();

    if (data?.user_id === authUser.id) {
      setToastMessage("You can't add yourself as a friend.");
      toast("You can't add yourself as a friend."); // Display toast immediately
      return;
    }

    if (error || !data) {
      setToastMessage("User not found.");
      toast("User not found."); // Display toast immediately
      return;
    }

    const myUserId = authUser.id;
    const targetUserId = data.user_id;

    // Check if there's already a pending or accepted friendship
    const { data: existingFriendship, error: friendshipError } = await supabase
      .from("Friends")
      .select("*")
      .eq("user_id1", myUserId)
      .eq("user_id2", targetUserId)
      .single();

    if (
      friendshipError &&
      friendshipError.details !== "The result contains 0 rows"
    ) {
      console.log("Error checking for existing friendship:", friendshipError);
      return;
    }

    if (existingFriendship) {
      setToastMessage("Friend request already exists or is accepted.");
      toast("Friend request already exists or is accepted."); // Display toast immediately
      return;
    }

    const { error: insertError } = await supabase.from("Friends").insert([
      {
        user_id1: myUserId,
        user_id2: targetUserId,
        accepted: false, // Pending request
      },
    ]);

    if (insertError) {
      console.log("Error sending friend request:", insertError);
      setToastMessage("Failed to send friend request.");
      toast("Failed to send friend request."); // Display toast immediately
    } else {
      setToastMessage("Friend request sent to: " + friend.username);
      toast("Friend request sent to: " + friend.username); // Display toast immediately
    }
  }

  const [friends, setFriends] = useState<
    | {
        user_id: string;
        display_name: string;
        username: string;
        profile_picture_url: string | null;
      }[]
    | null
  >(null);
  const [friendRequests, setFriendRequests] = useState<
    | {
        user_id: string;
        display_name: string;
        username: string;
        profile_picture_url: string | null;
      }[]
    | null
  >(null);
  const [viewedUser, setViewedUser] = useState<{
    user_id: string;
    display_name: string;
    username: string;
    profile_picture_url: string | null;
  } | null>(null);

  const [amOwner, setAmOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    addFriend(values);
    form.reset();
    setDialogOpen(false); // Close the dialog after submitting
  }

  useEffect(() => {
    async function fetchData() {
      const authUser = await getAuthenticatedUser();
      try {
        if (!authUser) {
          console.error("No authenticated user found");
          setLoading(false);
          return;
        }

        const viewedUser = await getViewedUser({ username });
        setViewedUser(viewedUser);
        if (!viewedUser) {
          console.error("Viewed user not found");
          setLoading(false);
          return;
        }

        setAmOwner(authUser.id === viewedUser.user_id);

        // Fetch friends for the viewed user
        const friendIds = await getFriends({ userId: viewedUser.user_id });
        if (friendIds.length > 0) {
          const friendDetails = await getUserDetails(friendIds);
          setFriends(friendDetails);
        } else {
          setFriends([]);
        }
        // Get friend requests for the viewed user
        const friendRequestIds = await getFriendRequests({
          userId: viewedUser.user_id,
        });
        if (friendRequestIds.length > 0) {
          const friendRequestDetails = await getUserDetails(friendRequestIds);
          setFriendRequests(friendRequestDetails);
        } else {
          setFriendRequests([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [username]);

  if (loading)
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <LoaderCircle size={32} strokeWidth={2.75} className="animate-spin" />
      </div>
    );

  function handleDelete() {
    if (friendToRemove) {
      handleDeleteFriend(friendToRemove);
      setShowConfirmDelete(false);
      setFriendToRemove(null);
    }
  }

  function cancelDelete() {
    setShowConfirmDelete(false);
    setFriendToRemove(null);
  }

  return (
    <div>
      <Toaster />
      <Dialog
        open={showConfirmDelete}
        onOpenChange={(open) => {
          if (!open) {
            setShowConfirmDelete(false);
            setFriendToRemove(null);
          }
        }}
      >
        <div className="px-4">
          <div className="flex">
            <h2 className="py-4 text-3xl font-bold">Friends</h2>
            {amOwner && (
              <div className="px-4 py-4">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Plus className="size-9 cursor-pointer rounded-full bg-primary p-2 text-primary-foreground shadow-md transition-colors hover:bg-primary/60" />
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="scroll-m-20 text-xl font-extrabold tracking-tight lg:text-2xl">
                        Add a New Friend
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                      >
                        {/* Username Field */}
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Username<span className="">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="username"
                                  required
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Submit Button */}
                        <Button
                          type="submit"
                          className="w-full transition-colors hover:bg-primary/60"
                        >
                          Submit
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
          {amOwner && friendRequests && friendRequests.length > 0 ? (
            <>
              <p className="text-lg font-bold">Friend Requests Pending...</p>
              <ul className="">
                {friendRequests.map((friendRequest) => (
                  <li key={friendRequest.user_id} className="">
                    <div className="flex items-center space-x-4">
                      <div className="relative flex w-fit items-center rounded-lg border bg-card p-4 shadow-lg transition-colors hover:bg-card/20">
                        <Link
                          href={`/user/${friendRequest.username}`}
                          className="flex items-center"
                        >
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarImage
                              src={
                                friendRequest.profile_picture_url as
                                  | string
                                  | undefined
                              }
                              alt={`${friendRequest.display_name}'s avatar`}
                              className="rounded-full"
                            />
                            <AvatarFallback className="flex h-full w-full items-center justify-center rounded-full font-bold">
                              {friendRequest.display_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="px-2">
                            <p className="font-semibold">
                              {friendRequest.display_name}
                            </p>
                            <p className="text-sm">@{friendRequest.username}</p>
                          </div>
                        </Link>
                        <div className="space-x-2 space-y-2">
                          <Button
                            onClick={() => {
                              handleAcceptRequest(friendRequest.user_id);
                            }}
                            className="bg-green-600 text-white hover:bg-green-800"
                          >
                            Accept
                          </Button>
                          <Button
                            onClick={() => {
                              handleDeleteFriend(friendRequest.user_id);
                            }}
                            className="bg-red-500 text-white hover:bg-red-600"
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p></p>
          )}
          {friends && friends.length > 0 ? (
            <ul className="">
              {friends.map((friend) => (
                <li key={friend.user_id} className="">
                  <div className="flex items-center space-x-4">
                    <div className="relative flex w-fit items-center rounded-lg border bg-card p-4 shadow-lg transition-colors hover:bg-card/20">
                      <Link href={`/user/${friend.username}`} className="flex">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarImage
                              src={
                                friend.profile_picture_url as
                                  | string
                                  | undefined
                              }
                              alt={`${friend.display_name}'s avatar`}
                              className="rounded-full"
                            />
                            <AvatarFallback className="flex h-full w-full items-center justify-center rounded-full font-bold">
                              {friend.display_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        <div className="px-2">
                          <p className="font-semibold">{friend.display_name}</p>
                          <p className="text-sm">@{friend.username}</p>
                        </div>
                      </Link>
                      {amOwner && (
                        <DialogTrigger asChild>
                          <X
                            onClick={() => {
                              setShowConfirmDelete(true);
                              setFriendToRemove(friend.user_id);
                            }}
                            className="my-auto size-6 cursor-pointer rounded-full bg-primary p-1 shadow-md transition-colors hover:bg-primary/60"
                          />
                        </DialogTrigger>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <></>
          )}
        </div>
        {/* Confirmation Modal */}
        <DialogContent className="w-full max-w-sm rounded-lg p-6 shadow-lg">
          <DialogHeader>
            <DialogTitle className="mb-4 text-xl font-semibold">
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="mb-4 text-sm">
              Are you sure?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-4">
            <DialogClose asChild>
              <Button
                onClick={cancelDelete}
                className="rounded-md px-4 py-2 transition-colors hover:bg-primary/60"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleDelete}
              className="rounded-md px-4 py-2 transition-colors hover:bg-primary/60"
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
