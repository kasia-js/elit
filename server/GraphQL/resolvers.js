require('dotenv').config();
const db = require('../models/index');
const User = db.User;
const Event = db.Event;
const { requestGithubUser } = require('../authenticationMidleware');

let currentUser;

const resolvers = {
  Query: {
    githubLoginUrl: () =>
      `https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}&scope=user`,
    getUsers: async () => {
      try {
        user = await User.findAll();
        return user;
      } catch (error) {
        console.log(error);
      }
    },
  },
  Mutation: {
    async CreateEvent(parent, { input }) {
      console.log('input:', input);
      try {
        await Event.create({
          title: input.eventTitle,
          description: input.eventDescription,
          date: input.date,
          link: input.eventLink,
          location: input.location,
          eventLeader: input.userName,
          //USERID
          participants: 0,
          categories: input.categories,
        });
      } catch (err) {
        console.error(err);
      }
      return { eventTitle: input.eventTitle };
    },
    
    async CreateUserData(parent, { input, id }) {
      console.log('linkedIn:', input);
      console.log('gitHub:', input);
      try {
        const user = await User.findOne({where: { id }})
        console.log('USER!!!', user)
        user.linkedIn = input.linkedIn
        user.gitHub = input.gitHub
        user.portfolio = input.portfolio
        user.bio = input.bio
        await user.save()
        return user;
      } catch (err) {
        console.error(err);
      }
      
    },

    async authorizeWithGithub(parent, { code }) {
      console.log('User:', User.findOne);
      // 1. Obtain data from GitHub
      let githubUser = await requestGithubUser({
        client_id: `${process.env.CLIENT_ID}`,
        client_secret: `${process.env.CLIENT_SECRET}`,
        code,
      });
      // 2. Package the results in a single object, write the value to currentUser global variable
      currentUser = {
        id: githubUser.id,
        email: githubUser.email,
        name: githubUser.name,
        githubLogin: githubUser.login,
        githubToken: githubUser.access_token,
        location: githubUser.location,
        avatar: githubUser.avatar_url,
      };
      console.log('currentUser:', currentUser);
      // 3. Return user data and their token
      let user;
      try {
        user = await User.findOne({
          where: { id: `${currentUser.id}` },
        });

        if (!user) {
          const {
            id,
            email,
            name,
            githubLogin,
            githubToken,
            location,
            avatar,
          } = currentUser;
          await User.create({
            id: id,
            email: email,
            name: name,
            githubLogin: githubLogin,
            githubToken: githubToken,
            location: location,
            avatar: avatar,
          });
        }
      } catch (err) {
        console.error(err);
      }
      console.log('hello:');

      console.log('user:', user);
      return { user: currentUser, token: githubUser.access_token };
    },
  },
};

module.exports = resolvers;
