import { db } from '../src/lib/db'

async function updateUsernames() {
  try {
    const users = await db.user.findMany({
      where: {
        username: null
      }
    })

    for (const user of users) {
      // Generate username from email (part before @)
      const username = user.email.split('@')[0]
      
      await db.user.update({
        where: { id: user.id },
        data: { username }
      })
      
      console.log(`Updated user ${user.email} with username: ${username}`)
    }

    console.log('Username update completed successfully')
  } catch (error) {
    console.error('Error updating usernames:', error)
  } finally {
    await db.$disconnect()
  }
}

updateUsernames()