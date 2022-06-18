terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
  required_version = ">= 0.13"
  backend "s3" {
    bucket                  = "terraform-my-own-project"
    key                     = "my-terraform-project"
    region                  = "eu-west-1"
    shared_credentials_file = "~/.aws/credentials"
  }
}
provider "aws" {
  region                   = "eu-west-1"
  shared_credentials_files = "~/.aws/credentials"
}
