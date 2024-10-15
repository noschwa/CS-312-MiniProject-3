const express = require('express');
const bodyParser = require('body-parser');
const pg = require('pg');
const app = express();


// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, req.body, req.query);
  next();
});
app.use((req, res, next) => {
  if (req.query.user_id) {
    req.userId = parseInt(req.query.user_id);
  }
  next();
});

// PostgreSQL connection setup
const db = new pg.Client({
  user: 'postgres',
  host: 'localhost',
  database: 'BlogDB',
  password: 'noah3000',
  port: 5433
});
db.connect();

// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});

// GET route for signup form
app.get('/signup', (req, res) => {
  res.render('signup');
});

// POST route for signup form
app.post('/signup', async (req, res) => {
  const { user_id, password, name } = req.body;
  console.log(`Signup attempt: user_id=<span class="math-inline">\{user\_id\}, password\=</span>{password}, name=${name}`);

  try {
    const result = await db.query('SELECT * FROM users WHERE user_id = $1', [user_id]);

    if (result.rows.length > 0) {
      res.send('User ID already taken. Please choose a different one.');
    } else {
      await db.query('INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)',
        [user_id, password, name]); 
      console.log(`New user created: ${user_id}`);
      res.redirect('/signin');
    }
  } catch (error) {
    console.error('Error during signup:', error);
    res.send('Error during signup');
  }
});

// GET route for signin form
app.get('/signin', (req, res) => {
  res.render('signin');
});

// Signin route
app.post('/signin', async (req, res) => {
  const { user_id, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE user_id = $1 AND password = $2', [user_id, password]);
    const user = result.rows[0];

    if (user) {
      res.redirect(`/?user_id=${user.user_id}`);
    } else {
      res.send('Invalid credentials');
    }
  } catch (error) {
    console.error('Error during sign in:', error);
    res.send('Error during sign in.');
  }
});

// Homepage route
app.get('/', async (req, res) => {
  const loggedInUserId = req.query.user_id;

  if (loggedInUserId) {
    try {
      const userResult = await db.query('SELECT name FROM users WHERE user_id = $1', [loggedInUserId]);
      const userName = userResult.rows[0].name;

      const result = await db.query(
        `SELECT blogs.blog_id, blogs.title, blogs.body, blogs.date_created, users.name AS author_name 
         FROM blogs 
         JOIN users ON blogs.creator_user_id = users.user_id 
         ORDER BY blogs.date_created DESC`
      );
      const posts = result.rows;
      console.log(`Fetched posts: ${JSON.stringify(posts)}`);
      
      res.render('index', { posts, loggedInUserId, userName });
    } catch (error) {
      console.error('Error fetching data:', error);
      res.send('Error fetching data.');
    }
  } else {
    res.redirect('/signin');
  }
});

// POST route for creating new post
app.post('/', async (req, res) => {
  const {title, body, user_id} = req.body;


  // Check if the user is logged in
  if (!user_id) {
    console.log('No user_id provided, redirecting to signin');
    return res.redirect('/signin');
  }

  try {
    const userResult = await db.query('SELECT name FROM users WHERE user_id = $1', [user_id]);
    const userName = userResult.rows[0].name;

    const insertResult = await db.query(
      'INSERT INTO blogs (creator_name, creator_user_id, title, body, date_created) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [userName, user_id, title, body]
    );

    if (insertResult.rows.length > 0) {
      console.log(`Post created successfully: ${JSON.stringify(insertResult.rows[0])}`);
      return res.redirect(`/?user_id=${user_id}`);
    } else {
      console.log('Post creation failed: No rows returned from insert query');
      return res.status(500).send('Error creating post: Database did not return the created post');
    }
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Error creating post. Please try again.');
  }
});

// GET route to edit a blog post
app.get('/edit/:id', async (req, res) => {
  const postId = req.params.id;
  const loggedInUserId = req.userId;

  console.log(`Edit post - postId=<span class="math-inline">\{postId\}, loggedInUserId\=</span>{loggedInUserId}`);

  // If the user is not logged in, redirect to the signin page
  if (!loggedInUserId) {
    return res.redirect('/signin');
  }

  try {
    // Fetch the post from the database by postId
    const result = await db.query('SELECT * FROM blogs WHERE blog_id = $1', [postId]);
    const post = result.rows[0];

    // Check if the logged-in user is the creator of the blog post
    if (parseInt(loggedInUserId) === post.creator_user_id) {
      // If they match, render the edit form
      res.render('edit', { post, loggedInUserId });
    } else {
      // If the user is not the creator, show an error message
      console.log('User not authorized to edit this post.');
      res.send('You are not authorized to edit this post.');
    }
  } catch (error) {
    console.error('Error fetching post for editing:', error);
    res.send('Error fetching post for editing.');
  }
});

// Edit Post Route
app.post('/edit/:id', async (req, res) => {
  const postId = req.params.id;
  const { title, content } = req.body;
  const loggedInUserId = req.userId; 

  console.log(`Edit Post Submission: postId=<span class="math-inline">\{postId\}, title\=</span>{title}, content=<span class="math-inline">\{content\}, loggedInUserId\=</span>{loggedInUserId}`);

  if (!loggedInUserId) {
    return res.redirect('/signin'); 
  }

  try {
    // Fetch the post from the database to verify the creator
    const result = await db.query('SELECT * FROM blogs WHERE blog_id = $1', [postId]);
    const post = result.rows[0];

    if (!post) {
      console.log('Post not found.');
      return res.send('Post not found.');
    }

    // Ensure the logged-in user is the creator of the post
    if (post.creator_user_id === parseInt(loggedInUserId)) {
      console.log('User authorized. Proceeding with update.');

      // Update the post in the database
      const updateResult = await db.query(
        'UPDATE blogs SET title = $1, body = $2, date_created = NOW() WHERE blog_id = $3',
        [title, content, postId]
      );

      if (updateResult.rowCount > 0) {
        console.log(`Post updated successfully. Redirecting to the home page.`);
        res.redirect(`/?user_id=${loggedInUserId}`); 
      } else {
        console.log('Post update failed.');
        res.send('Failed to update the post.');
      }
    } else {
      // If the user is not the creator, show an error message
      console.log('User not authorized to edit this post.');
      res.send('You are not authorized to edit this post.');
    }
  } catch (error) {
    console.error('Error during post update:', error);
    res.send('Error during post update.');
  }
});

// Delete Post Route
app.get('/delete/:id', async (req, res) => {
  const postId = req.params.id;
  const loggedInUserId = req.userId;

  console.log(`Delete post - postId=<span class="math-inline">\{postId\}, loggedInUserId\=</span>{loggedInUserId}`);

  // If the user is not logged
  if (!loggedInUserId) {
    return res.redirect('/signin');
  }

  try {
    // Fetch the post from the database
    const result = await db.query('SELECT * FROM blogs WHERE blog_id = $1', [postId]);
    const post = result.rows[0];

    // Ensure the logged-in user is the creator of the post
    if (post.creator_user_id === parseInt(loggedInUserId)) {
      // Delete the post if the user is the creator
      await db.query('DELETE FROM blogs WHERE blog_id = $1', [postId]);
      console.log(`Post deleted by user_id=${loggedInUserId}`);
      res.redirect('/?user_id=' + loggedInUserId);
    } else {
      // If the user is not the creator, show an error message
      console.log('User not authorized to delete this post.');
      res.send('You are not authorized to delete this post.');
    }
  } catch (error) {
    console.error('Error deleting post:', error);
    res.send('Error deleting post.');
  }
});

// In app.js

app.post('/delete/:id', async (req, res) => {
  const postId = req.params.id;
  const loggedInUserId = req.body.user_id;

  console.log(`Delete post attempt - postId: ${postId}, loggedInUserId: ${loggedInUserId}`);

  if (!loggedInUserId) {
    console.log('No user_id provided, redirecting to signin');
    return res.redirect('/signin');
  }

  try {
    console.log('Fetching post from database...');
    const postResult = await db.query('SELECT * FROM blogs WHERE blog_id = $1', [postId]);

    if (postResult.rows.length === 0) {
      console.log(`Post with id ${postId} not found`);
      return res.status(404).send('Post not found');
    }

    const post = postResult.rows[0];
    console.log(`Post found: ${JSON.stringify(post)}`);

    if (post.creator_user_id !== parseInt(loggedInUserId)) {
      console.log(`User ${loggedInUserId} is not authorized to delete post ${postId}`);
      return res.status(403).send('You are not authorized to delete this post');
    }

    console.log('User authorized. Proceeding with deletion...');
    const deleteResult = await db.query('DELETE FROM blogs WHERE blog_id = $1 RETURNING *', [postId]);

    if (deleteResult.rows.length > 0) {
      console.log(`Post ${postId} deleted successfully`);
      return res.redirect(`/?user_id=${loggedInUserId}`);
    } else {
      console.log(`Failed to delete post ${postId}`);
      return res.status(500).send('Failed to delete the post');
    }
  } catch (error) {
    console.error('Error during post deletion:', error);
    res.status(500).send('Error deleting post. Please try again.');
  }
});
