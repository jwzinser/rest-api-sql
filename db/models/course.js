"use strict";
const Sequelize = require('sequelize');
module.exports = (sequelize) => {
    class Course extends Sequelize.Model {}
    Course.init({
        // attributes
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId:{
            type: Sequelize.INTEGER,
            references:{
                model: "users",
                key: 'id'
            },
            allowNull: false
        },
        title: {
            type: Sequelize.STRING,
            allowNull: false
        },
        description: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        estimatedTime: {
            type: Sequelize.STRING
        },
        materialsNeeded: {
            type: Sequelize.STRING
        }
    }, {
        sequelize 
    });
    
    Course.associate = (models) => {
        Course.belongsTo(models.User, {
            foreignKey: {
                fieldName: "userId"
            }
        });
    }
    return Course;
}