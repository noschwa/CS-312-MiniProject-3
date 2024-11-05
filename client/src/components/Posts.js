import React, { useEffect, useState } from "react";
import axios from "axios";

const Posts = ({ userId }) => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3000/posts?user_id=${userId}`
        );
        setPosts(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchPosts();
  }, [userId]);

  return (
    <div>
      <h2>Blog Posts</h2>
      <ul>
        {posts.map((post) => (
          <li key={post.blog_id}>
            <h3>{post.title}</h3>
            <p>{post.body}</p>
            <small>By: {post.author_name}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Posts;
