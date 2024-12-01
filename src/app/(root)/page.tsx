import { createClient } from "@/utils/supabase/server";
import Feed from "./feed";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("Post").select("*");
  if (error) {
    console.error(error);
  }

  return <Feed initalPosts={data} />;
}
